export const base58alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
export const base58reverse = Object.fromEntries(Array.from(base58alphabet).map((e, i) => [e.charCodeAt(0), i]))

export function base58_encode(buffer: Buffer) {
    let bytes: number[] = []
    for (const b of buffer) {
        let carry = b;
        for (let i = 0; i < bytes.length; i++) {
            carry += bytes[i]! * 256;
            bytes[i] = carry % 58;
            carry = Math.floor(carry / 58);
        }
        while (carry) {
            bytes.push(carry % 58);
            carry = Math.floor(carry / 58);
        }
    }
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = base58alphabet.charCodeAt(bytes[i]!);
    }
    for (const b of buffer) {
        if (b) break;
        bytes.push("1".codePointAt(0)!);
    }
    bytes.reverse();
    return Buffer.from(bytes).toString();
}

export function base58_decode(buffer: Buffer) {
    const leading_ones = buffer.findIndex((b) => b != "1".charCodeAt(0))
    return Buffer.from(Array(leading_ones).fill(0).concat(
        buffer
            .map((e) => base58reverse[e]!)
            .reduce<number[]>((acc, i) => {
                let carry = i;
                for (let k = acc.length - 1; k >= 0; k--) {
                    const x = acc[k]! * 58 + carry;
                    acc[k] = x & 0xff;
                    carry = x >> 8;
                }
                if (carry > 0) acc.unshift(carry);
                return acc;
            }, [])
    ))
}