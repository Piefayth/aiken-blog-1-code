(BigInt.prototype as any).toJSON = function () {
    return this.toString()
}

import { Lucid, Data, Emulator } from "https://deno.land/x/lucid@0.10.7/mod.ts"
import { generateAndSaveKeys } from "./generate_keys.ts"
import { getValidators } from "./validators.ts"

let {
    recipientPrivateKey,
    recipientAddress
} = await generateAndSaveKeys()

let {
    countValidator
} = getValidators()

const emulator = new Emulator([{
    address: recipientAddress,
    assets: {
        lovelace: 20000000000n
    }
}])

const lucid = await Lucid.new(emulator)
lucid.selectWalletFromPrivateKey(recipientPrivateKey)

const CountDatumSchema = Data.Object({
    owner: Data.Bytes(),
    count: Data.Integer()
})
type CountDatum = Data.Static<typeof CountDatumSchema>
const CountDatum = CountDatumSchema as unknown as CountDatum
 
const contractAddress = lucid.utils.validatorToAddress(countValidator)

const owner = lucid.utils.getAddressDetails(
  recipientAddress
).paymentCredential!.hash
const count = 0n
const originalDatum: CountDatum = { owner, count }

const depositTx = await lucid.newTx()
  .payToAddressWithData(
    contractAddress,
    {
      inline: Data.to(originalDatum, CountDatum)
    },
    {}
  )
  .complete()

const signed = await depositTx.sign().complete()
const depositTxHash = await signed.submit()

await lucid.awaitTx(depositTxHash)

const scriptUtxos = await lucid.utxosAt(contractAddress)
console.log("Successfully stored assets!")
console.log(JSON.stringify(scriptUtxos, null, 2))


const contractUtxos = await lucid.utxosAt(contractAddress)
const depositUtxo = contractUtxos.find(txo => txo.txHash === depositTxHash)!

const updatedDatum: CountDatum = { owner, count: count + 1n }

const withdrawlTx = await lucid.newTx()
    .collectFrom(
        [depositUtxo],
        Data.void()
    )
    .attachSpendingValidator(countValidator)
    .payToAddressWithData(
      contractAddress,
      { inline: Data.to(updatedDatum, CountDatum)}, 
      {}
    )
    .addSigner(recipientAddress)
    .complete()

const withdrawlSigned = await withdrawlTx.sign().complete()
const withdrawlTxHash = await withdrawlSigned.submit()

await lucid.awaitTx(withdrawlTxHash)

const countUtxos = await lucid.utxosAt(contractAddress)
console.log(JSON.stringify(countUtxos, null, 2))