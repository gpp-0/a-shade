import { AtpAgent, type AtpSessionData, type AtpSessionEvent } from "@atproto/api"
import { open, writeFile, type FileHandle } from "node:fs/promises";
import { decrypt, encrypt, encryptionKey } from "./crypto.js";

export function getTimestamp() {
    return (new Date()).toISOString()
}

async function loadSession() {
    let file: FileHandle | undefined;
    try {
        console.log("Loading session from disk")
        file = await open(process.env.SESSION_FILE_PATH!)
        const encrypted = await file.readFile()
        const decrypted = await decrypt(encryptionKey, encrypted)
        return JSON.parse(decrypted) as AtpSessionData
    } catch {
        console.log("Failed to load stored session")
    } finally {
        if (file) {
            await file.close()
        }
    }
}

async function initSession(agent: AtpAgent) {
    let savedSession = await loadSession();

    let refreshed = false;
    if (savedSession) {
        try {
            console.log("Resuming session")
            await agent.resumeSession(savedSession)
            refreshed = true
        } catch (error) {
            console.log("Failed to refresh session\n" + error)
        }
    }
    if (!savedSession || !refreshed) {
        console.log("Creating new session")
        await agent.login({
            identifier: process.env.DID!,
            password: process.env.APP_PASSWORD!,
        })
    }
    if (!agent.hasSession) {
        throw Error("Could not establish session")
    }
}

async function persistSession(event: AtpSessionEvent, session: AtpSessionData | undefined) {
    console.log("Persisting session: " + event)
    const sessionString = JSON.stringify(session)
    const encrypted = await encrypt(encryptionKey, sessionString)
    await writeFile(process.env.SESSION_FILE_PATH!, encrypted)
}

export const agent = new AtpAgent({
    service: new URL("https://" + process.env.PDS_HOST!),
    persistSession: persistSession
})
await initSession(agent)

export function createPost(postBody: string) {
    return agent.com.atproto.repo.createRecord({
        repo: process.env.DID!,
        collection: "app.bsky.feed.post",
        record: {
            $type: "app.bsky.feed.post",
            text: postBody,
            createdAt: getTimestamp()
        }
    })
}
