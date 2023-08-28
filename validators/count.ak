use aiken/transaction.{
    InlineDatum,
    ScriptContext, 
    Redeemer, 
    Spend,
    find_input
}
use aiken/list
use aiken/hash.{Blake2b_224, Hash}
use aiken/transaction/credential.{VerificationKey}

type VerificationKeyHash =
  Hash<Blake2b_224, VerificationKey>

type CountDatum {
    owner: VerificationKeyHash,
    count: Int
}

validator {
  fn count(
      _datum: Data, 
      _redeemer: Redeemer,
      ctx: ScriptContext
  ) -> Bool {
    let ScriptContext { transaction, purpose } = ctx
    expect Spend(spent_utxo_reference) = purpose
    expect Some(input) = find_input(
        transaction.inputs, 
        spent_utxo_reference
    )

    expect InlineDatum(maybe_old_count_datum) = input.output.datum
    expect old_count_datum: CountDatum = maybe_old_count_datum

    let count_script_address = input.output.address

    expect Some(output) = transaction.outputs
      |> list.filter(fn (output) {
        output.address == count_script_address
      })
      |> list.head()

    expect InlineDatum(maybe_new_count_datum) = output.datum
    expect new_count_datum: CountDatum = maybe_new_count_datum

    and {
      list.has(transaction.extra_signatories, old_count_datum.owner),
      new_count_datum.count == old_count_datum.count + 1,
      new_count_datum.owner == old_count_datum.owner
    }
  }
}
