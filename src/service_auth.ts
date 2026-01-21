import { randomBytes } from "node:crypto"
import { signJwt } from "./crypto.js"
import { Agent } from "@atproto/api"

async function generateServiceJwt(params: { aud: string, lxm: string }) {
    const timestamp = Math.floor(Date.now() / 1000)
    const header = {
        alg: "ES256",
        typ: "JWT"
    }
    const body = {
        iss: process.env.DID,
        aud: params.aud,
        iat: timestamp,
        exp: timestamp + 60,
        lxm: params.lxm,
        jti: randomBytes(16).toString('base64url')
    }
    return await signJwt(header, body)
}

const jwt = await generateServiceJwt({ aud: "did:web:" + process.env.PDS_HOST, lxm: "com.atproto.repo.uploadBlob" })

const agent = new Agent({
    service: new URL("https://" + process.env.PDS_HOST!),
    headers: { "Authorization": `Bearer ${jwt}` }
})