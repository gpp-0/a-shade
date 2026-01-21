import { generateKeyPairSync, subtle, webcrypto } from "node:crypto";
import { base58_decode, base58_encode } from "./base58.js";
import { p256 } from "@noble/curves/nist.js";

export let signingKey: webcrypto.CryptoKey
export let encryptionKey: webcrypto.CryptoKey
export let jwk: {
    kty: "EC",
    crv: "P-256",
    x: string,
    y: string,
    d: string
};
let iv: Buffer<ArrayBuffer>
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function printNewKeypair() {
    const keypair = generateKeyPairSync("ec", { namedCurve: "P-256" })
    const privateKey = keypair.privateKey.export({ format: "jwk" })
    console.log("Private key: " + "z" + base58_encode(Buffer.concat([Buffer.from([0x86, 0x26]), Buffer.from(privateKey.d!, "base64url")])))
    console.log("Public key: " + "z" + base58_encode(Buffer.concat([Buffer.from([0x80, 0x24, privateKey.y!.at(-1)?.charCodeAt(0)! % 2 == 0 ? 0x02 : 0x03]), Buffer.from(privateKey.x!, "base64url")])))
}

export async function signJwt(header: Object, body: Object, privateKey?: webcrypto.CryptoKey) {
    if (!privateKey) privateKey = signingKey
    const headerPayload = Buffer.from(JSON.stringify(header)).toString("base64url") + "." + Buffer.from(JSON.stringify(body)).toString("base64url")
    const signature = await subtle.sign({ name: "ECDSA", hash: "SHA-256", }, privateKey, Buffer.from(headerPayload))
    const jwt = headerPayload + "." + Buffer.from(signature).toString("base64url")
    console.log(jwt)
    return jwt
}

export function getPrivateKey() {
    if (!signingKey) {
        throw Error("Could not import private key")
    }
    return signingKey
}

async function importSigningKey() {
    const privateKey = base58_decode(Buffer.from(process.env.PRIVATE_KEY!).subarray(1)).subarray(2)
    const publicKey = p256.getPublicKey(privateKey, false).subarray(1)
    jwk = {
        kty: "EC",
        crv: "P-256",
        x: Buffer.from(publicKey.subarray(0, 32)).toString("base64url"),
        y: Buffer.from(publicKey.subarray(32)).toString("base64url"),
        d: Buffer.from(privateKey).toString("base64url")
    }
    signingKey = await subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"])
}
// await importSigningKey()

async function importEncryptionKey() {
    iv = Buffer.from(process.env.IV!, "base64")
    const jwk = {
        kty: "oct",
        alg: "A256GCM",
        k: process.env.ENCRYPTION_KEY!
    }
    encryptionKey = await subtle.importKey("jwk", jwk, "AES-GCM", false, ["decrypt", "encrypt"])
}
await importEncryptionKey()

export async function encrypt(key: webcrypto.CryptoKey, plaintext: string) {
    const encoded = encoder.encode(plaintext)
    const encryptedBuffer = await subtle.encrypt({ name: "AES-GCM", iv }, key, encoded)
    return Buffer.from(encryptedBuffer)
}

export async function decrypt(key: webcrypto.CryptoKey, ciphertext: Buffer<ArrayBuffer>) {
    const decrypted = await subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext)
    return decoder.decode(decrypted)
}