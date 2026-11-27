"""Offline regression tests; no credentials or live service required."""
import contextlib
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[1] / "skills/quickbi-data-analyst/scripts"
sys.path.insert(0, str(SCRIPTS))
import assets
import chat
import gateway
from output import ApiError

CFG = {"gateway": "https://example.invalid", "accessId": "fixture-id",
       "accessKey": "fixture-secret"}


class AssetTests(unittest.TestCase):
    def test_personal_name_filter_keeps_pagination_and_learning_status(self):
        item = {"asset_id": "dashboard-1", "asset_name": "销售看板",
                "asset_type": "dashboard", "wiki_status": "completed",
                "md_status": "completed"}
        response = {"success": True, "data": {"items": [item], "total": 3}}
        with patch.object(assets, "http_json", return_value=response) as request:
            result = assets.list_assets(CFG, page=1, page_size=1, keyword="销售")
        self.assertEqual(result["items"], [item])
        self.assertTrue(result["hasMore"])
        self.assertEqual(result["nextPage"], 2)
        self.assertEqual(request.call_args.kwargs["params"], {"offset": 0, "limit": 1})

    def test_no_name_match_on_one_page_is_not_exhausted(self):
        response = {"success": True, "data": {
            "items": [{"asset_name": "其他资产"}], "total": 3}}
        with patch.object(assets, "http_json", return_value=response):
            result = assets.list_assets(CFG, page=2, page_size=1, keyword="销售")
        self.assertEqual(result["items"], [])
        self.assertTrue(result["hasMore"])
        self.assertEqual(result["nextPage"], 3)

    def test_enterprise_uses_its_pagination_and_distinct_id(self):
        item = {"enterprise_asset_id": "enterprise-1", "asset_name": "销售"}
        with patch.object(assets, "http_json", return_value={"data": {
                "items": [item], "total": 3}}) as request:
            result = assets.list_assets(CFG, scope="enterprise", page=2,
                                        page_size=2, keyword="销售")
        self.assertEqual(request.call_args.args[2], assets.PATH_ENTERPRISE)
        self.assertEqual(request.call_args.kwargs["params"],
                         {"page": 2, "page_size": 2, "keyword": "销售"})
        self.assertEqual(result["items"], [item])
        self.assertFalse(result["hasMore"])
        self.assertIsNone(result["nextPage"])

    def test_invalid_pagination_never_calls_api(self):
        for args in ({"page": 0}, {"page_size": 101}, {"page_size": 0}):
            with self.subTest(args=args), patch.object(assets, "http_json") as request:
                with self.assertRaises(ApiError):
                    assets.list_assets(CFG, **args)
                request.assert_not_called()

    def test_bad_response_is_not_reported_as_empty_catalogue(self):
        for data in ({}, {"items": None, "total": 2}, {"items": [], "total": "bad"}):
            with self.subTest(data=data), patch.object(assets, "http_json", return_value={"data": data}):
                with self.assertRaises(ApiError):
                    assets.list_assets(CFG)

    def test_assets_cli_reuses_workspace_credentials(self):
        response = {"data": {"items": [], "total": 0}}
        out = io.StringIO()
        with patch.object(sys, "argv", ["assets.py", "--workspace-dir", "/tmp/fixture"]), \
             patch.object(assets, "load_config", return_value=CFG) as config, \
             patch.object(assets, "setup_ssl"), \
             patch.object(assets, "http_json", return_value=response), \
             contextlib.redirect_stdout(out):
            assets.main()
        config.assert_called_once_with("/tmp/fixture")
        self.assertEqual(json.loads(out.getvalue())["scope"], "personal")

    def test_list_http_request_is_signed_with_pagination(self):
        response = io.BytesIO(json.dumps({"success": True, "data": {
            "items": [], "total": 0}}).encode())
        with patch.object(gateway, "urlopen_safe", return_value=response) as request:
            assets.list_assets(CFG, page=3, page_size=20)
        req = request.call_args.args[0]
        self.assertEqual(req.full_url, CFG["gateway"] + assets.PATH_PERSONAL + "?offset=40&limit=20")
        self.assertEqual(req.get_method(), "GET")
        self.assertTrue(req.get_header("X-gw-signature"))


class SelectionTests(unittest.TestCase):
    def test_submit_sends_structured_ids_and_preserves_message(self):
        response = {"data": {"session_id": "sid", "conversation_id": "cid"}}
        with patch.object(chat, "http_json", return_value=response) as request:
            self.assertEqual(chat.submit(CFG, "原始问题", "sid", 60,
                                         asset_ids=[" dashboard-1 ", "dashboard-1", "dataset-2"]),
                             ("sid", "cid"))
        self.assertEqual(request.call_args.kwargs["json_body"], {
            "message": "原始问题", "user_id": "fixture-id", "session_id": "sid",
            "asset_ids": ["dashboard-1", "dataset-2"]})

    def test_unselected_turn_does_not_inherit_previous_ids(self):
        with patch.object(chat, "http_json", return_value={"data": {}}) as request:
            chat.submit(CFG, "问题", "sid", 60, asset_ids=["asset-1"])
            chat.submit(CFG, "新问题", "sid", 60)
            chat.submit(CFG, "新问题", "sid", 60, asset_ids=[])
        for call in request.call_args_list[1:]:
            self.assertNotIn("asset_ids", call.kwargs["json_body"])

    def test_invalid_ids_are_rejected_before_network(self):
        for ids in ([""] , [" "], ["x" * 37], [None], "asset-1", ["a"] * 11):
            with self.subTest(ids=ids), patch.object(chat, "http_json") as request, \
                 contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaises(SystemExit) as error:
                    chat.submit(CFG, "问题", None, 60, asset_ids=ids)
                self.assertEqual(error.exception.code, 2)
                request.assert_not_called()

    def test_selection_error_never_retries_without_ids(self):
        with patch.object(chat, "http_json", side_effect=ApiError("ASSET_NOT_READY", "学习中")) as request, \
             contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(SystemExit):
                chat.submit(CFG, "问题", None, 60, asset_ids=["asset-1"])
        request.assert_called_once()
        self.assertEqual(request.call_args.kwargs["json_body"]["asset_ids"], ["asset-1"])

    def test_cli_forwards_asset_id_and_keeps_dashboard_mode(self):
        argv = ["chat.py", "--message", "生成销售看板", "--asset-id", "asset-1",
                "--asset-id", "asset-2", "--dashboard", "--session-id", "sid"]
        step = {"status": "done", "final": True, "events": 1, "text": "完成"}
        with patch.object(sys, "argv", argv), \
             patch.object(chat, "load_config", return_value=dict(CFG)), \
             patch.object(chat, "load_settings", return_value={}), \
             patch.object(chat, "setup_ssl"), \
             patch.object(chat, "submit", return_value=("sid", "cid")) as submit, \
             patch.object(chat, "consume_stream_step", return_value=step), \
             contextlib.redirect_stdout(io.StringIO()):
            chat.main()
        self.assertEqual(submit.call_args.kwargs["asset_ids"], ["asset-1", "asset-2"])
        self.assertIn("qbi-dashboard-builder", submit.call_args.args[1])
        self.assertTrue(submit.call_args.args[1].endswith("生成销售看板"))

    def test_resume_and_cancel_reject_asset_ids_before_credentials(self):
        for mode in (["--conversation-id", "cid"], ["--cancel", "--session-id", "sid"],
                     ["--message", "问题", "--conversation-id", "cid"]):
            with self.subTest(mode=mode), \
                 patch.object(sys, "argv", ["chat.py", "--asset-id", "a"] + mode), \
                 patch.object(chat, "load_config") as config, \
                 contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaises(SystemExit) as error:
                    chat.main()
                self.assertEqual(error.exception.code, 2)
                config.assert_not_called()

    def test_learning_conflict_has_actionable_error(self):
        code, _, suggestion = gateway.map_http_error(409, "asset wiki is not completed")
        self.assertEqual(code, "ASSET_NOT_READY")
        self.assertIn("学习", suggestion)

    def test_other_conflicts_do_not_claim_asset_learning_failure(self):
        code, _, _ = gateway.map_http_error(409, "conversation is already running")
        self.assertEqual(code, "STATE_CONFLICT")


if __name__ == "__main__":
    unittest.main()
