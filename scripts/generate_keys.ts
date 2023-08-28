// keys.ts
import { C, Lucid, fromHex } from "https://deno.land/x/lucid@0.10.7/mod.ts"

async function generateAndSaveKeys() {
  const lucid = await Lucid.new(undefined, "Preview")
  await Deno.mkdir("keys", { recursive: true })

  async function handleKey(path: string, generator: () => Promise<string> | string): Promise<string> {
    try {
      return await Deno.readTextFile(path)
    } catch (error) {
      const data = typeof generator === "function" ? await generator() : generator
      await Deno.writeTextFile(path, data)
      return data
    }
  }

  const issuerPrivateKey = await handleKey("./keys/issuer.sk", lucid.utils.generatePrivateKey)
  const recipientPrivateKey = await handleKey("./keys/recipient.sk", lucid.utils.generatePrivateKey)
  const issuerAddress = await handleKey("./keys/issuer.addr",  async () => lucid.selectWalletFromPrivateKey(issuerPrivateKey).wallet.address())
  const recipientAddress = await handleKey("./keys/recipient.addr", async () => lucid.selectWalletFromPrivateKey(recipientPrivateKey).wallet.address())

  return {
    issuerPrivateKey,
    recipientPrivateKey,
    issuerAddress,
    recipientAddress
  }
}

export { generateAndSaveKeys }


generateAndSaveKeys()