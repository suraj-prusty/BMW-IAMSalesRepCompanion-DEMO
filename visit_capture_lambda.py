"""Standalone AWS Lambda for the visit_capture table (API Gateway HTTP API, payload v2.0).

Deployed independently of the Express app. CORS is configured on API Gateway, not here.
sales_rep_id is a caller-supplied filter, NOT authentication, until a real authorizer exists.
"""

import base64
import json
import logging
import os
import re
from datetime import date, datetime
from decimal import Decimal
from urllib.parse import unquote

REP_INDEX = "GSI_REP_VISITS"
FORM_TYPES = {"dealer", "ir"}
STATUSES = {"draft", "submitted"}
RESERVED_IDS = {"draft", "search"}
ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,128}$")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MAX_FORM_BYTES = 300_000  # DynamoDB items are capped at 400 KB.
MAX_QUERY_PAGES = 100


class HttpError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def _json_default(value):
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    raise TypeError(f"Type {type(value)} is not serializable")


def _response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, default=_json_default),
    }


def _is_valid_date(value):
    if not isinstance(value, str) or not DATE_PATTERN.match(value):
        return False
    try:
        date.fromisoformat(value)
    except ValueError:
        return False
    return True


def _is_valid_timestamp(value):
    if not isinstance(value, str):
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return True


def _require_id(value, label):
    if not isinstance(value, str) or not ID_PATTERN.match(value):
        raise HttpError(400, f"{label} is missing or invalid")
    return value


def _require_form_type(value):
    if value not in FORM_TYPES:
        raise HttpError(400, "form_type must be 'dealer' or 'ir'")
    return value


def _require_rep(value):
    if not isinstance(value, str) or not value.strip() or len(value) > 128:
        raise HttpError(400, "sales_rep_id is required")
    return value


def _require_date(value, label):
    if not _is_valid_date(value):
        raise HttpError(400, f"{label} must be a valid YYYY-MM-DD date")
    return value


def _reject_constant(constant):
    raise ValueError(f"Unsupported JSON constant: {constant}")


def _parse_body(event):
    raw = event.get("body")
    if not raw:
        raise HttpError(400, "Request body is required")
    try:
        if event.get("isBase64Encoded"):
            raw = base64.b64decode(raw).decode("utf-8")
        # boto3's resource API rejects floats, so numbers are parsed as Decimal.
        parsed = json.loads(raw, parse_float=Decimal, parse_constant=_reject_constant)
    except ValueError:
        raise HttpError(400, "Malformed JSON body")
    if not isinstance(parsed, dict):
        raise HttpError(400, "Request body must be a JSON object")
    return parsed


def _to_api(item):
    # The local store calls the entity dealer_id; keep that alias in responses for the existing client.
    if item is None:
        return None
    return {**item, "dealer_id": item.get("dealer_code")}


def _newest_first(items, prefer_submitted=False):
    ordered = sorted(items, key=lambda i: str(i.get("visit_id", "")))
    ordered = sorted(ordered, key=lambda i: str(i.get("updated_at", "")), reverse=True)
    if prefer_submitted:
        ordered = sorted(ordered, key=lambda i: i.get("status") == "submitted", reverse=True)
    return ordered


def _query_all(table, **params):
    items = []
    start_key = None
    for _ in range(MAX_QUERY_PAGES):
        kwargs = dict(params)
        if start_key:
            kwargs["ExclusiveStartKey"] = start_key
        result = table.query(**kwargs)
        items.extend(result.get("Items", []))
        start_key = result.get("LastEvaluatedKey")
        if not start_key:
            return items
    raise RuntimeError("Query exceeded the page limit")


def _resolve_route(event):
    method = (event.get("requestContext") or {}).get("http", {}).get("method") or event.get("httpMethod")
    segments = [unquote(s) for s in (event.get("rawPath") or "").split("/") if s]
    if "visit-capture" not in segments:
        return {"name": "none"}
    rest = segments[segments.index("visit-capture") + 1:]

    if method == "OPTIONS":
        return {"name": "options"}
    if method == "GET" and not rest:
        return {"name": "list"}
    if len(rest) == 2:
        dealer_code, second = rest
        if method == "GET" and second == "draft":
            return {"name": "draft", "dealer_code": dealer_code}
        if method == "GET" and second == "search":
            return {"name": "search", "dealer_code": dealer_code}
        if method == "GET":
            return {"name": "get", "dealer_code": dealer_code, "visit_id": second}
        if method == "PUT":
            return {"name": "put", "dealer_code": dealer_code, "visit_id": second}
    return {"name": "none"}


class VisitCaptureApi:
    def __init__(self, table):
        self.table = table

    def put_visit(self, event, dealer_code, visit_id):
        _require_id(dealer_code, "dealer_code")
        _require_id(visit_id, "visit_id")
        if visit_id in RESERVED_IDS:
            raise HttpError(400, "visit_id is invalid")

        body = _parse_body(event)
        form_type = _require_form_type(body.get("form_type"))
        if body.get("status") not in STATUSES:
            raise HttpError(400, "status must be 'draft' or 'submitted'")
        sales_rep_id = _require_rep(body.get("sales_rep_id"))
        visit_date = _require_date(body.get("visit_date"), "visit_date")
        form_data = body.get("form_data")
        if not isinstance(form_data, dict):
            raise HttpError(400, "form_data must be an object")
        if len(json.dumps(form_data, default=str).encode("utf-8")) > MAX_FORM_BYTES:
            raise HttpError(413, "form_data is too large")
        submitted_by = body.get("submitted_by")
        if submitted_by is not None and not isinstance(submitted_by, str):
            raise HttpError(400, "submitted_by must be a string")
        recommendation_id = body.get("recommendation_id")
        if recommendation_id is not None and not isinstance(recommendation_id, str):
            raise HttpError(400, "recommendation_id must be a string")

        key = {"dealer_code": dealer_code, "visit_id": visit_id}
        existing = self.table.get_item(Key=key).get("Item")

        if existing:
            if existing.get("sales_rep_id") != sales_rep_id:
                raise HttpError(409, "Visit belongs to a different sales representative")
            # A submitted visit counts as accepted, so it must not silently revert to a draft.
            if existing.get("status") == "submitted" and body["status"] == "draft":
                raise HttpError(409, "A submitted visit cannot be saved as a draft")

        updated_at = body.get("updated_at")
        if not _is_valid_timestamp(updated_at):
            updated_at = datetime.now().astimezone().isoformat(timespec="milliseconds")

        item = {
            **(existing or {}),
            **key,
            "sales_rep_id": sales_rep_id,
            "form_type": form_type,
            "status": body["status"],
            "visit_date": visit_date,
            "form_data": form_data,
            "submitted_by": submitted_by if submitted_by is not None else (existing or {}).get("submitted_by", ""),
            "updated_at": updated_at,
        }
        link = (recommendation_id or "").strip() or (existing or {}).get("recommendation_id")
        if link:
            item["recommendation_id"] = link

        self.table.put_item(Item=item)
        return {"visit": _to_api(item)}

    def get_visit(self, dealer_code, visit_id):
        _require_id(dealer_code, "dealer_code")
        _require_id(visit_id, "visit_id")
        item = self.table.get_item(Key={"dealer_code": dealer_code, "visit_id": visit_id}).get("Item")
        if not item:
            raise HttpError(404, "Visit not found")
        return {"visit": _to_api(item)}

    def find_draft(self, dealer_code, query):
        _require_id(dealer_code, "dealer_code")
        form_type = _require_form_type(query.get("form_type"))
        rep = _require_rep(query.get("sales_rep_id"))

        items = _query_all(
            self.table,
            KeyConditionExpression="#d = :d",
            FilterExpression="#ft = :ft AND #st = :st AND #rep = :rep",
            ExpressionAttributeNames={
                "#d": "dealer_code", "#ft": "form_type", "#st": "status", "#rep": "sales_rep_id",
            },
            ExpressionAttributeValues={":d": dealer_code, ":ft": form_type, ":st": "draft", ":rep": rep},
        )
        # Re-check in code so another rep's draft can never be returned.
        matches = [
            i for i in items
            if i.get("dealer_code") == dealer_code and i.get("form_type") == form_type
            and i.get("status") == "draft" and i.get("sales_rep_id") == rep
        ]
        return {"draft": _to_api(_newest_first(matches)[0]) if matches else None}

    def find_visit_by_date(self, dealer_code, query):
        _require_id(dealer_code, "dealer_code")
        form_type = _require_form_type(query.get("form_type"))
        rep = _require_rep(query.get("sales_rep_id"))
        visit_date = _require_date(query.get("visit_date"), "visit_date")

        items = _query_all(
            self.table,
            KeyConditionExpression="#d = :d",
            FilterExpression="#ft = :ft AND #vd = :vd AND #rep = :rep",
            ExpressionAttributeNames={
                "#d": "dealer_code", "#ft": "form_type", "#vd": "visit_date", "#rep": "sales_rep_id",
            },
            ExpressionAttributeValues={":d": dealer_code, ":ft": form_type, ":vd": visit_date, ":rep": rep},
        )
        # Several matches: a submitted visit wins, then the most recently updated.
        matches = [
            i for i in items
            if i.get("dealer_code") == dealer_code and i.get("form_type") == form_type
            and i.get("visit_date") == visit_date and i.get("sales_rep_id") == rep
        ]
        return {"visit": _to_api(_newest_first(matches, prefer_submitted=True)[0]) if matches else None}

    def list_visits(self, query):
        rep = _require_rep(query.get("sales_rep_id"))
        start = _require_date(query["start_date"], "start_date") if query.get("start_date") else None
        end = _require_date(query["end_date"], "end_date") if query.get("end_date") else None
        if start and end and start > end:
            raise HttpError(400, "start_date must not be after end_date")

        condition = "#rep = :rep"
        names = {"#rep": "sales_rep_id"}
        values = {":rep": rep}
        if start or end:
            names["#vd"] = "visit_date"
        if start and end:
            condition += " AND #vd BETWEEN :s AND :e"
            values[":s"] = start
            values[":e"] = end
        elif start:
            condition += " AND #vd >= :s"
            values[":s"] = start
        elif end:
            condition += " AND #vd <= :e"
            values[":e"] = end

        items = _query_all(
            self.table,
            IndexName=REP_INDEX,
            KeyConditionExpression=condition,
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=values,
        )
        return {"rows": [_to_api(i) for i in items]}


def create_handler(table, logger=None):
    logger = logger or logging.getLogger()

    def handler(event, context=None):
        route = {"name": "none"}
        try:
            if table is None:
                raise RuntimeError("VISIT_CAPTURE_TABLE is not configured")
            api = VisitCaptureApi(table)
            route = _resolve_route(event)
            query = event.get("queryStringParameters") or {}
            name = route["name"]

            if name == "options":
                return {"statusCode": 204, "headers": {}, "body": ""}
            if name == "list":
                return _response(200, api.list_visits(query))
            if name == "draft":
                return _response(200, api.find_draft(route["dealer_code"], query))
            if name == "search":
                return _response(200, api.find_visit_by_date(route["dealer_code"], query))
            if name == "get":
                return _response(200, api.get_visit(route["dealer_code"], route["visit_id"]))
            if name == "put":
                return _response(200, api.put_visit(event, route["dealer_code"], route["visit_id"]))
            raise HttpError(404, "Route not found")
        except HttpError as err:
            return _response(err.status, {"error": err.message})
        except Exception as err:  # noqa: BLE001 - last-resort handler returns a safe 500.
            # Never log or return payloads/notes; only the failure class and AWS request id.
            request_id = getattr(err, "response", {}).get("ResponseMetadata", {}).get("RequestId") \
                if isinstance(getattr(err, "response", None), dict) else None
            logger.error(json.dumps({
                "level": "error",
                "route": route["name"],
                "errorName": type(err).__name__,
                "requestId": request_id,
            }))
            return _response(500, {"error": "Internal server error"})

    return handler


def _build_table():
    table_name = os.environ.get("VISIT_CAPTURE_TABLE")
    if not table_name:
        return None
    import boto3  # Imported lazily so unit tests run without AWS libraries.

    region = os.environ.get("AWS_REGION", "eu-central-1")
    return boto3.resource("dynamodb", region_name=region).Table(table_name)


_default_handler = None


def handler(event, context=None):
    global _default_handler
    if _default_handler is None:
        _default_handler = create_handler(_build_table())
    return _default_handler(event, context)
