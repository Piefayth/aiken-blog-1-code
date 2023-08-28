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
    ownerValidator
} = getValidators()

const emulator = new Emulator([{
    address: recipientAddress,
    assets: {
        lovelace: 20000000000n
    }
}])

const lucid = await Lucid.new(emulator)
lucid.selectWalletFromPrivateKey(recipientPrivateKey)

const OwnerDatumSchema = Data.Object({
    owner: Data.Bytes()
})
type OwnerDatum = Data.Static<typeof OwnerDatumSchema>
const OwnerDatum = OwnerDatumSchema as unknown as OwnerDatum
 
const contractAddress = lucid.utils.validatorToAddress(ownerValidator)

const owner = lucid.utils.getAddressDetails(
  recipientAddress
).paymentCredential!.hash
const datum: OwnerDatum = { owner }

const depositTx = await lucid.newTx()
  .payToAddressWithData(
    contractAddress,
    {
      inline: Data.to(datum, OwnerDatum)
    },
    {
      lovelace: 50000000n,
    }
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

const withdrawlTx = await lucid.newTx()
    .collectFrom(
        [depositUtxo],
        Data.void()
    )
    .attachSpendingValidator(ownerValidator)
    .addSigner(recipientAddress)
    .complete()

const withdrawlSigned = await withdrawlTx.sign().complete()
const withdrawlTxHash = await withdrawlSigned.submit()

await lucid.awaitTx(withdrawlTxHash)

const ownerUTxos = await lucid.utxosAt(recipientAddress)
console.log("Successfully retrieved assets!")
console.log(JSON.stringify(ownerUTxos, null, 2))