(BigInt.prototype as any).toJSON = function () {
    return this.toString()
}

import { 
Data,
Emulator,
  Lucid,
  Script,
  applyDoubleCborEncoding, 
  applyParamsToScript, 
fromText
} from "https://deno.land/x/lucid@0.10.7/mod.ts"
import { generateAndSaveKeys } from "./generate_keys.ts";
import { getValidators } from "./validators.ts";

let {
    guessMintingPolicy
} = getValidators()

const CoolTokenRedeemerSchema = Data.Object({
    guessed_word: Data.Bytes()
})
type CoolTokenRedeemer = Data.Static<typeof CoolTokenRedeemerSchema>
const CoolTokenRedeemer = CoolTokenRedeemerSchema as unknown as CoolTokenRedeemer

const parameterizedMintCoolToken = {
  type: "PlutusV2",
  script: applyDoubleCborEncoding(
    applyParamsToScript(
        guessMintingPolicy.script, [fromText("new secret")]
    )
  )
} as Script

let {
    recipientPrivateKey,
    recipientAddress
} = await generateAndSaveKeys()

const emulator = new Emulator([{
    address: recipientAddress,
    assets: {
        lovelace: 20000000000n
    }
}])

const lucid = await Lucid.new(emulator)
lucid.selectWalletFromPrivateKey(recipientPrivateKey)


const coolTokenPolicyId = lucid.utils.validatorToScriptHash(parameterizedMintCoolToken)
const assetName = `${coolTokenPolicyId}${fromText("COOL")}`

const tx = await lucid.newTx()
    .attachMintingPolicy(parameterizedMintCoolToken)
    .mintAssets(
        {
            [assetName]: 10000000000n
        }, 
        Data.to(
            { guessed_word: fromText("new secret") }, 
            CoolTokenRedeemer
        )
    )
    .complete()

const signed = await tx.sign().complete()
const txHash = await signed.submit()

await lucid.awaitTx(txHash)

const scriptUtxos = await lucid.wallet.getUtxos()
console.log("Successfully minted. Recipient utxos: ")
console.log(JSON.stringify(scriptUtxos, null, 2))
    