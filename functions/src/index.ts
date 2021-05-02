import * as functions from "firebase-functions";
import { Telegraf } from "telegraf";
import { InlineQueryResult } from "telegraf/typings/core/types/typegram";
import * as database from "./kaomoji.json";

type KaomojiDatabase = { [emoji: string]: Array<string> }
type Kaomoji = { emoji: string, tags: Array<string> }
const kaomojis = Object.entries(database as KaomojiDatabase).map(([emoji, tags]) => ({ emoji, tags }));

const bot = new Telegraf(functions.config().telegram.token, {
  telegram: { webhookReply: true }
});

function getKaomojisByTagOrAll(tag: string): Array<Kaomoji> {
  const filtered = kaomojis.filter(({ tags }) => tags.includes(tag));
  return filtered.length ? filtered : kaomojis;
}

function createInlineQueryResult(kaomoji: Kaomoji, id: number): InlineQueryResult {
  return {
    id: id.toString(),
    type: "article",
    title: kaomoji.emoji,
    description: kaomoji.tags.join(", "),
    input_message_content: {
      message_text: kaomoji.emoji
    }
  };
}

bot.on("inline_query", async (ctx) => {
  const results = getKaomojisByTagOrAll(ctx.update.inline_query.query).slice(0, 50).map(createInlineQueryResult);
  ctx.answerInlineQuery(results, { cache_time: 10, is_personal: true });
});

exports.bot = functions
  .runWith({ memory: "128MB", maxInstances: 10 })
  .https.onRequest(async (request, response) => {
    functions.logger.log("Incoming message", request.body);
    try {
      await bot.handleUpdate(request.body, response);
      response.status(200).end();
    } catch (e) {
      functions.logger.error("Error handling request", e);
      response.status(500).end();
    }
  });
