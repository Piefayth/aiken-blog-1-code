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

type OwnerDatum {
    owner: VerificationKeyHash
}

validator {
  fn only_for_owner(
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

    expect InlineDatum(maybe_owner_datum) = input.output.datum
    expect owner_datum: OwnerDatum = maybe_owner_datum

    list.has(transaction.extra_signatories, owner_datum.owner)
  }
}