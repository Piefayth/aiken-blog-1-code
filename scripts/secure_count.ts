(BigInt.prototype as any).toJSON = function () {
    return this.toString()
}

import { Lucid, Data, Emulator, applyDoubleCborEncoding, applyParamsToScript, Script, fromText } from "https://deno.land/x/lucid@0.10.7/mod.ts"
import { generateAndSaveKeys } from "./generate_keys.ts"
import { getValidators } from "./validators.ts"

let {
    recipientPrivateKey,
    recipientAddress
} = await generateAndSaveKeys()

let {
    secureCountValidator,
    countMintingPolicy
} = getValidators()

const emulator = new Emulator([{
    address: recipientAddress,
    assets: {
        lovelace: 20000000000n
    }
}])

const lucid = await Lucid.new(emulator)
lucid.selectWalletFromPrivateKey(recipientPrivateKey)


const secureCountScriptHash = lucid.utils.validatorToScriptHash(secureCountValidator)
const secureCountScriptAddress = lucid.utils.validatorToAddress(secureCountValidator)
const parameterizedCountMintingPolicy = {
    type: "PlutusV2",
    script: applyDoubleCborEncoding(
        applyParamsToScript(
            countMintingPolicy.script, [secureCountScriptHash]
        )
    )
} as Script
const countMintingPolicyId = lucid.utils.validatorToScriptHash(parameterizedCountMintingPolicy)


const CountDatumSchema = Data.Object({
    owner: Data.Bytes(),
    authorizing_policy: Data.Bytes(),
    count: Data.Integer()
})
type CountDatum = Data.Static<typeof CountDatumSchema>
const CountDatum = CountDatumSchema as unknown as CountDatum
 
const contractAddress = lucid.utils.validatorToAddress(secureCountValidator)

const owner = lucid.utils.getAddressDetails(
  recipientAddress
).paymentCredential!.hash
const count = 0n
const originalDatum: CountDatum = { 
    owner, 
    count, 
    authorizing_policy: countMintingPolicyId
}

const authorizingNFTName = `${countMintingPolicyId}${fromText("COUNT")}`

const initializingTx = await lucid.newTx()
    .attachMintingPolicy(parameterizedCountMintingPolicy)
    .mintAssets(
        {
            [authorizingNFTName]: 1n,
        }, 
        Data.void()
    )
    .payToAddressWithData(
        contractAddress,
        {
            inline: Data.to(originalDatum, CountDatum)
        },
        {
            [authorizingNFTName]: 1n
        }
    )
    .addSigner(recipientAddress)
    .complete()

const signed = await initializingTx.sign().complete()
const initializingTxHash = await signed.submit()

await lucid.awaitTx(initializingTxHash)

const scriptUtxos = await lucid.utxosAt(contractAddress)
console.log("Successfully initialized datum!")
console.log(JSON.stringify(scriptUtxos, null, 2))

const contractUtxos = await lucid.utxosAt(contractAddress)
const depositUtxo = contractUtxos.find(txo => txo.txHash === initializingTxHash)!

const updatedDatum: CountDatum = { 
    ...originalDatum,
    count: originalDatum.count + 1n
}

const updateCountTx = await lucid.newTx()
    .collectFrom(
        [depositUtxo],
        Data.void()
    )
    .attachSpendingValidator(secureCountValidator)
    .payToAddressWithData(
      contractAddress,
      { inline: Data.to(updatedDatum, CountDatum)}, 
      {
        [authorizingNFTName]: 1n
      }
    )
    .addSigner(recipientAddress)
    .complete()

const updateCountTxSigned = await updateCountTx.sign().complete()
const updateCountTxHash = await updateCountTxSigned.submit()

await lucid.awaitTx(updateCountTxHash)

const countUtxos = await lucid.utxosAt(contractAddress)
console.log(JSON.stringify(countUtxos, null, 2))