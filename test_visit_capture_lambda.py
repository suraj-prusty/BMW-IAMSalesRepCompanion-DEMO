import json
import unittest
from decimal import Decimal

from visit_capture_lambda import create_handler

TABLE_NAME = "bmw_visit_capture-dev"


class ProvisionedThroughputExceededException(Exception):
    pass


class FakeTable:
    """Minimal stand-in for a boto3 DynamoDB Table that records every call."""

    def __init__(self, items=(), query_pages=(), fail_on=None):
        self.store = {(i["dealer_code"], i["visit_id"]): i for i in items}
        self.pages = list(query_pages)
        self.fail_on = fail_on
        self.calls = []

    def _call(self, operation, kwargs):
        self.calls.append((operation, kwargs))
        if self.fail_on == operation:
            raise ProvisionedThroughputExceededException("secret internal detail arn:aws:dynamodb")

    def get_item(self, **kwargs):
        self._call("get_item", kwargs)
        item = self.store.get((kwargs["Key"]["dealer_code"], kwargs["Key"]["visit_id"]))
        return {"Item": item} if item else {}

    def put_item(self, **kwargs):
        self._call("put_item", kwargs)
        item = kwargs["Item"]
        self.store[(item["dealer_code"], item["visit_id"])] = item
        return {}

    def query(self, **kwargs):
        self._call("query", kwargs)
        return self.pages.pop(0) if self.pages else {"Items": []}

    def queries(self):
        return [kwargs for operation, kwargs in self.calls if operation == "query"]


class ListLogger:
    def __init__(self):
        self.lines = []

    def error(self, line):
        self.lines.append(line)


class SilentLogger:
    def error(self, line):
        pass


def make_handler(table):
    return create_handler(table, logger=SilentLogger())


def event(method, path, query=None, body=None):
    return {
        "version": "2.0",
        "rawPath": path,
        "requestContext": {"http": {"method": method}},
        "queryStringParameters": query,
        "body": body if isinstance(body, str) or body is None else json.dumps(body),
    }


def payload(**overrides):
    base = {
        "form_type": "dealer",
        "status": "draft",
        "visit_date": "2026-10-12",
        "sales_rep_id": "marcus.schmidt",
        "submitted_by": "marcus.demo@corporate.com",
        "updated_at": "2026-10-12T08:00:00.000Z",
        "form_data": {"visit_notes": "first"},
    }
    base.update(overrides)
    return base


def visit(**overrides):
    base = {
        "dealer_code": "D107",
        "visit_id": "v-1",
        "sales_rep_id": "marcus.schmidt",
        "form_type": "dealer",
        "status": "draft",
        "visit_date": "2026-10-12",
        "form_data": {},
        "submitted_by": "",
        "updated_at": "2026-10-12T08:00:00.000Z",
    }
    base.update(overrides)
    return base


def parse(response):
    return json.loads(response["body"])


class UpsertTests(unittest.TestCase):
    def test_upsert_writes_the_expected_keys_and_attributes(self):
        table = FakeTable()
        res = make_handler(table)(event("PUT", "/visit-capture/D107/v-1", body=payload(recommendation_id="rec-1")))

        self.assertEqual(res["statusCode"], 200)
        put = next(kwargs for op, kwargs in table.calls if op == "put_item")
        self.assertEqual(put["Item"]["dealer_code"], "D107")
        self.assertEqual(put["Item"]["visit_id"], "v-1")
        self.assertEqual(put["Item"]["recommendation_id"], "rec-1")
        saved = parse(res)["visit"]
        self.assertEqual(saved["dealer_id"], "D107")
        self.assertEqual(saved["form_data"]["visit_notes"], "first")

    def test_same_dealer_and_visit_id_updates_the_same_item(self):
        table = FakeTable()
        handler = make_handler(table)
        handler(event("PUT", "/visit-capture/D107/v-1", body=payload()))
        handler(event("PUT", "/visit-capture/D107/v-1", body=payload(form_data={"visit_notes": "second"})))

        self.assertEqual(len(table.store), 1)
        self.assertEqual(table.store[("D107", "v-1")]["form_data"]["visit_notes"], "second")

    def test_draft_to_submitted_keeps_the_visit_id_and_recommendation_id(self):
        table = FakeTable()
        handler = make_handler(table)
        handler(event("PUT", "/visit-capture/D107/v-1", body=payload(recommendation_id="rec-1")))
        res = handler(event("PUT", "/visit-capture/D107/v-1", body=payload(status="submitted", recommendation_id="rec-1")))

        saved = parse(res)["visit"]
        self.assertEqual(saved["visit_id"], "v-1")
        self.assertEqual(saved["status"], "submitted")
        self.assertEqual(saved["recommendation_id"], "rec-1")
        self.assertEqual(len(table.store), 1)

    def test_omitting_recommendation_id_never_erases_an_existing_link(self):
        table = FakeTable(items=[visit(recommendation_id="rec-9")])
        handler = make_handler(table)

        for link in (None, "", "   "):
            res = handler(event("PUT", "/visit-capture/D107/v-1", body=payload(recommendation_id=link)))
            self.assertEqual(parse(res)["visit"]["recommendation_id"], "rec-9")

        body = payload()
        res = handler(event("PUT", "/visit-capture/D107/v-1", body=body))
        self.assertEqual(parse(res)["visit"]["recommendation_id"], "rec-9")

    def test_a_different_rep_cannot_overwrite_and_submitted_cannot_revert_to_draft(self):
        table = FakeTable(items=[visit(status="submitted")])
        handler = make_handler(table)

        other_rep = handler(event("PUT", "/visit-capture/D107/v-1", body=payload(sales_rep_id="sofia.keller", status="submitted")))
        self.assertEqual(other_rep["statusCode"], 409)

        downgrade = handler(event("PUT", "/visit-capture/D107/v-1", body=payload(status="draft")))
        self.assertEqual(downgrade["statusCode"], 409)
        self.assertEqual(table.store[("D107", "v-1")]["status"], "submitted")

    def test_json_floats_are_stored_as_decimal_because_boto3_rejects_float(self):
        table = FakeTable()
        raw = json.dumps(payload(form_data={"score": 1.5, "count": 3}))
        res = make_handler(table)(event("PUT", "/visit-capture/D107/v-1", body=raw))

        self.assertEqual(res["statusCode"], 200)
        stored = table.store[("D107", "v-1")]["form_data"]
        self.assertEqual(stored["score"], Decimal("1.5"))
        self.assertIsInstance(stored["count"], int)
        self.assertEqual(parse(res)["visit"]["form_data"]["score"], 1.5)

    def test_oversized_form_data_is_rejected_with_413(self):
        res = make_handler(FakeTable())(event("PUT", "/visit-capture/D107/v-1", body=payload(form_data={"notes": "x" * 310_000})))
        self.assertEqual(res["statusCode"], 413)


class QueryTests(unittest.TestCase):
    def test_draft_query_filters_dealer_form_type_status_and_rep_and_returns_the_newest(self):
        table = FakeTable(query_pages=[{"Items": [
            visit(visit_id="old", updated_at="2026-10-10T08:00:00.000Z"),
            visit(visit_id="new", updated_at="2026-10-12T09:00:00.000Z"),
            visit(visit_id="other-rep", sales_rep_id="sofia.keller", updated_at="2026-10-12T10:00:00.000Z"),
            visit(visit_id="other-type", form_type="ir", updated_at="2026-10-12T10:00:00.000Z"),
            visit(visit_id="submitted", status="submitted", updated_at="2026-10-12T10:00:00.000Z"),
            visit(visit_id="other-dealer", dealer_code="D999", updated_at="2026-10-12T10:00:00.000Z"),
        ]}])
        res = make_handler(table)(event("GET", "/visit-capture/D107/draft", query={"form_type": "dealer", "sales_rep_id": "marcus.schmidt"}))

        self.assertEqual(parse(res)["draft"]["visit_id"], "new")
        values = table.queries()[0]["ExpressionAttributeValues"]
        self.assertEqual(values[":rep"], "marcus.schmidt")
        self.assertEqual(values[":st"], "draft")

    def test_draft_query_returns_null_when_only_another_rep_has_a_draft(self):
        table = FakeTable(query_pages=[{"Items": [visit(sales_rep_id="sofia.keller")]}])
        res = make_handler(table)(event("GET", "/visit-capture/D107/draft", query={"form_type": "dealer", "sales_rep_id": "marcus.schmidt"}))

        self.assertEqual(res["statusCode"], 200)
        self.assertIsNone(parse(res)["draft"])

    def test_draft_query_follows_pagination(self):
        table = FakeTable(query_pages=[
            {"Items": [visit(visit_id="a", updated_at="2026-10-01T00:00:00.000Z")], "LastEvaluatedKey": {"dealer_code": "D107", "visit_id": "a"}},
            {"Items": [visit(visit_id="b", updated_at="2026-10-05T00:00:00.000Z")]},
        ])
        res = make_handler(table)(event("GET", "/visit-capture/D107/draft", query={"form_type": "dealer", "sales_rep_id": "marcus.schmidt"}))

        self.assertEqual(parse(res)["draft"]["visit_id"], "b")
        self.assertEqual(len(table.queries()), 2)

    def test_search_prefers_a_submitted_visit_and_matches_rep_type_and_date(self):
        table = FakeTable(query_pages=[{"Items": [
            visit(visit_id="d", status="draft", updated_at="2026-10-12T12:00:00.000Z"),
            visit(visit_id="s", status="submitted", updated_at="2026-10-12T09:00:00.000Z"),
            visit(visit_id="x", sales_rep_id="sofia.keller", status="submitted"),
            visit(visit_id="y", visit_date="2026-10-11", status="submitted"),
        ]}])
        res = make_handler(table)(event("GET", "/visit-capture/D107/search", query={
            "form_type": "dealer", "visit_date": "2026-10-12", "sales_rep_id": "marcus.schmidt",
        }))

        self.assertEqual(parse(res)["visit"]["visit_id"], "s")

    def test_list_by_rep_queries_the_gsi_with_date_bounds_and_pages_through_results(self):
        last_key = {"sales_rep_id": "marcus.schmidt", "visit_date": "2026-10-12", "visit_id": "a", "dealer_code": "D107"}
        table = FakeTable(query_pages=[
            {"Items": [visit(visit_id="a")], "LastEvaluatedKey": last_key},
            {"Items": [visit(visit_id="b", status="submitted")]},
        ])
        res = make_handler(table)(event("GET", "/visit-capture", query={
            "sales_rep_id": "marcus.schmidt", "start_date": "2026-10-05", "end_date": "2026-10-11",
        }))

        rows = parse(res)["rows"]
        self.assertEqual([[r["visit_id"], r["status"], r["dealer_id"]] for r in rows],
                         [["a", "draft", "D107"], ["b", "submitted", "D107"]])

        first, second = table.queries()
        self.assertEqual(first["IndexName"], "GSI_REP_VISITS")
        self.assertEqual(first["KeyConditionExpression"], "#rep = :rep AND #vd BETWEEN :s AND :e")
        self.assertEqual((first["ExpressionAttributeValues"][":s"], first["ExpressionAttributeValues"][":e"]),
                         ("2026-10-05", "2026-10-11"))
        self.assertNotIn("ExclusiveStartKey", first)
        self.assertEqual(second["ExclusiveStartKey"]["visit_id"], "a")

    def test_list_supports_open_ended_date_ranges(self):
        table = FakeTable()
        handler = make_handler(table)
        handler(event("GET", "/visit-capture", query={"sales_rep_id": "marcus.schmidt", "start_date": "2026-10-05"}))
        handler(event("GET", "/visit-capture", query={"sales_rep_id": "marcus.schmidt", "end_date": "2026-10-11"}))
        handler(event("GET", "/visit-capture", query={"sales_rep_id": "marcus.schmidt"}))

        self.assertEqual([q["KeyConditionExpression"] for q in table.queries()],
                         ["#rep = :rep AND #vd >= :s", "#rep = :rep AND #vd <= :e", "#rep = :rep"])


class ValidationAndRoutingTests(unittest.TestCase):
    def test_invalid_input_is_rejected_with_400(self):
        handler = make_handler(FakeTable())

        def put(body, path="/visit-capture/D107/v-1"):
            return handler(event("PUT", path, body=body))

        def get(path, query=None):
            return handler(event("GET", path, query=query))

        cases = {
            "bad form_type": put(payload(form_type="other")),
            "bad status": put(payload(status="done")),
            "malformed json": put("{not json"),
            "nan constant": put('{"form_data": {"x": NaN}}'),
            "array body": put("[]"),
            "missing body": handler(event("PUT", "/visit-capture/D107/v-1")),
            "bad visit_date": put(payload(visit_date="2026-13-40")),
            "missing rep": put(payload(sales_rep_id="")),
            "form_data not object": put(payload(form_data="text")),
            "reserved visit id": put(payload(), "/visit-capture/D107/draft"),
            "bad dealer code": put(payload(), "/visit-capture/D1%2F07/v-1"),
            "list missing rep": get("/visit-capture", {"start_date": "2026-10-01"}),
            "list bad start": get("/visit-capture", {"sales_rep_id": "r", "start_date": "10/01/2026"}),
            "list reversed range": get("/visit-capture", {"sales_rep_id": "r", "start_date": "2026-10-11", "end_date": "2026-10-05"}),
            "draft missing rep": get("/visit-capture/D107/draft", {"form_type": "dealer"}),
            "draft bad form_type": get("/visit-capture/D107/draft", {"form_type": "x", "sales_rep_id": "r"}),
            "search bad date": get("/visit-capture/D107/search", {"form_type": "dealer", "sales_rep_id": "r", "visit_date": "nope"}),
        }
        for name, res in cases.items():
            with self.subTest(name):
                self.assertEqual(res["statusCode"], 400)

    def test_get_by_id_returns_the_visit_404_when_missing_and_never_crosses_dealers(self):
        handler = make_handler(FakeTable(items=[visit()]))

        found = handler(event("GET", "/visit-capture/D107/v-1"))
        self.assertEqual(found["statusCode"], 200)
        self.assertEqual(parse(found)["visit"]["visit_id"], "v-1")
        self.assertEqual(handler(event("GET", "/visit-capture/D107/missing"))["statusCode"], 404)
        self.assertEqual(handler(event("GET", "/visit-capture/D999/v-1"))["statusCode"], 404)

    def test_draft_and_search_paths_are_not_treated_as_visit_ids(self):
        table = FakeTable(items=[visit(visit_id="draft")])
        res = make_handler(table)(event("GET", "/visit-capture/D107/draft", query={"form_type": "dealer", "sales_rep_id": "marcus.schmidt"}))

        self.assertEqual(res["statusCode"], 200)
        self.assertTrue(all(op == "query" for op, _ in table.calls))

    def test_stage_prefix_is_tolerated_and_unknown_routes_return_404(self):
        handler = make_handler(FakeTable(items=[visit()]))

        self.assertEqual(handler(event("GET", "/prod/visit-capture/D107/v-1"))["statusCode"], 200)
        self.assertEqual(handler(event("GET", "/somewhere-else"))["statusCode"], 404)
        self.assertEqual(handler(event("DELETE", "/visit-capture/D107/v-1"))["statusCode"], 404)

    def test_dynamodb_failures_return_a_safe_500_without_internal_details(self):
        logger = ListLogger()
        handler = create_handler(FakeTable(fail_on="get_item"), logger=logger)
        res = handler(event("PUT", "/visit-capture/D107/v-1", body=payload(form_data={"visit_notes": "private note"})))

        self.assertEqual(res["statusCode"], 500)
        self.assertEqual(parse(res), {"error": "Internal server error"})
        self.assertNotIn("arn:aws", res["body"])
        self.assertEqual(len(logger.lines), 1)
        self.assertNotIn("private note", logger.lines[0])
        self.assertNotIn("arn:aws", logger.lines[0])
        self.assertIn("ProvisionedThroughputExceededException", logger.lines[0])

    def test_a_missing_table_is_a_safe_500(self):
        res = create_handler(None, logger=SilentLogger())(event("GET", "/visit-capture/D107/v-1"))

        self.assertEqual(res["statusCode"], 500)
        self.assertEqual(parse(res), {"error": "Internal server error"})


if __name__ == "__main__":
    unittest.main()
