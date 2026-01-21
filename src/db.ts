import { createPool, type RowDataPacket } from "mysql2/promise";

function getTimestamp() {
    const date = new Date()
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
}

export interface Quote extends RowDataPacket {
    id: number;
    text: string;
    uses: number;
    last_used: Date;
}

const pool = createPool({
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT!),
    database: process.env.DB_DATABASE!,
    user: process.env.DB_USERNAME!,
    password: process.env.DB_PASSWORD!
})

export async function getRandomQuote() {
    let quote: Quote | undefined;
    const [results, _] = await pool.execute<Quote[]>("SELECT * FROM quotes WHERE uses < 1 ORDER BY rand() LIMIT 1")
    if (results && results.length) {
        quote = results[0]!
    }
    return quote
}

export async function incrementQuoteUses(id: number) {
    await pool.execute("UPDATE quotes SET uses = uses + 1, last_used = ? WHERE id = ?", [getTimestamp(), id])
}

export async function getRandomQuoteAndIncrement() {
    const quote = await getRandomQuote()
    if (quote) {
        await incrementQuoteUses(quote.id)
    }
    return quote
}

export async function closeConnection() {
    await pool.end()
}