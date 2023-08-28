use aiken/transaction.{
    Input,
    Output,
    Transaction,
    InlineDatum,
    ScriptContext, 
    Redeemer, 
    Spend,
    Mint,
    find_input,
    find_script_outputs,
}
use aiken/transaction/value.{quantity_of}
use aiken/list
use aiken/hash.{Blake2b_224, Hash}
use aiken/transaction/credential.{VerificationKey, Script}

type ScriptHash =
  Hash<Blake2b_224, Script>

type VerificationKeyHash =
  Hash<Blake2b_224, VerificationKey>

type CountDatum {
    owner: VerificationKeyHash,
    authorizing_policy: ScriptHash,
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


    expect output_has_authorizing_nft(
      input.output, 
      old_count_datum.authorizing_policy
    )

    let count_script_address = input.output.address

    // For simplicity's sake, assume there is only one output to the script address.
    expect Some(output) = transaction.outputs
      |> list.filter(fn (output) {
        output.address == count_script_address
      })
      |> list.head()

    expect output_has_authorizing_nft(
      output, 
      old_count_datum.authorizing_policy
    )

    expect InlineDatum(maybe_new_count_datum) = output.datum
    expect new_count_datum: CountDatum = maybe_new_count_datum

    and {
      list.has(transaction.extra_signatories, old_count_datum.owner),
      new_count_datum.count == old_count_datum.count + 1,
      new_count_datum.owner == old_count_datum.owner,
      new_count_datum.authorizing_policy == old_count_datum.authorizing_policy
    }
  }
}

fn output_has_authorizing_nft(
  output: Output, 
  authorizing_policy: ScriptHash, 
) {
  let authorizing_token_name = "COUNT"

  1 == quantity_of(
    output.value, 
    authorizing_policy, 
    authorizing_token_name
  )
}

validator(count_script_hash: ByteArray) {
  fn count_authorizer(      
      _redeemer: Redeemer,
      ctx: ScriptContext
  ) {
    let ScriptContext { transaction, purpose } = ctx
    let Transaction { inputs, outputs, mint, .. } = transaction
    expect Mint(policy_id) = purpose

    let authorizing_token_name = "COUNT"

    expect no_count_data_in_inputs(inputs, count_script_hash)

    let new_count_outputs = find_script_outputs(outputs, count_script_hash)

    expect no_invalid_count_data(
      transaction,
      new_count_outputs, 
      authorizing_token_name, 
      policy_id
    )

    let num_minted = mint 
        |> value.from_minted_value
        |> quantity_of(policy_id, authorizing_token_name)

    // minted exactly 1 NFT per script output
    list.length(new_count_outputs) == num_minted
  } 
}

fn no_invalid_count_data(
  transaction: Transaction,
  script_outputs: List<Output>, 
  authorizing_token_name: ByteArray,
  policy_id: ScriptHash
) -> Bool {
  list.all(script_outputs, fn (output) {
    expect InlineDatum(maybe_new_count_datum) = output.datum

    expect new_count_datum: CountDatum = maybe_new_count_datum
    
    let has_exactly_one_authorizing_nft = 
      1 == quantity_of(output.value, policy_id, authorizing_token_name)

    and {
      list.has(transaction.extra_signatories, new_count_datum.owner),
      has_exactly_one_authorizing_nft,
      new_count_datum.count == 0,
      new_count_datum.authorizing_policy == policy_id
    }
  })
}

fn no_count_data_in_inputs(
  inputs: List<Input>, 
  count_script_hash: ScriptHash
) -> Bool {
  list.map(inputs, fn (input){
      input.output
  })
  |> find_script_outputs(count_script_hash)
  |> list.is_empty()
}