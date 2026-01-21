import { createPost } from "./agent.js";
import { closeConnection, getRandomQuoteAndIncrement } from "./db.js";

const quote = await getRandomQuoteAndIncrement()
if (quote) {
    await createPost(quote.text.replaceAll("\\n", "\n"))
}
await closeConnection()