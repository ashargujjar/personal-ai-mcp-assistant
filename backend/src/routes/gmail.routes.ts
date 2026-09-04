import { Router } from "express";
import {
  connectGmail,
  deleteMessage,
  disconnectGmail,
  getMessage,
  gmailCallback,
  gmailStatus,
  listMessages,
  sendMessage,
} from "../controllers/gmail.controller";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import { messageIdParamSchema, sendMessageSchema } from "../schema/gmail.schema";

const router = Router();

// No requireAuth here — Google redirects the browser directly, with no Authorization header.
// The user is identified via the signed `state` param instead.
router.get("/callback", gmailCallback);

router.use(requireAuth);
router.get("/status", gmailStatus);
router.get("/connect", connectGmail);
router.delete("/disconnect", disconnectGmail);
router.get("/messages", listMessages);
router.get("/messages/:id", validate(messageIdParamSchema), getMessage);
router.post("/send", validate(sendMessageSchema), sendMessage);
router.delete("/messages/:id", validate(messageIdParamSchema), deleteMessage);

export default router;
