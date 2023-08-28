import { MintingPolicy, SpendingValidator } from "https://deno.land/x/lucid@0.10.7/mod.ts"
import blueprint from "../plutus.json" assert { type: "json" }

export type Validators = {
    ownerValidator: SpendingValidator
    countValidator: SpendingValidator,
    secureCountValidator: SpendingValidator,
    countMintingPolicy: MintingPolicy,
    guessMintingPolicy: MintingPolicy
}

export function getValidators(): Validators {
    const ownerValidator = blueprint.validators.find(v => v.title === "owner.only_for_owner")
    if (!ownerValidator) {
        throw new Error ('owner validator not found')
    }

    const countValidator = blueprint.validators.find(v => v.title === "count.count")
    if (!countValidator) {
        throw new Error ('count validator not found')
    }

    const secureCountValidator = blueprint.validators.find(v => v.title === "secure_count.count")
    if (!secureCountValidator) {
        throw new Error ('secureCountValidator not found')
    }
    
    const countMintingPolicy = blueprint.validators.find(v => v.title === "secure_count.count_authorizer")
    if (!countMintingPolicy) {
        throw new Error ('countMintingPolicy not found')
    }

    const guessMintingPolicy = blueprint.validators.find(v => v.title === "guess.mint_my_cool_token")
    if (!guessMintingPolicy) {
        throw new Error ('guessMintingPolicy not found')
    }

    return {
        ownerValidator: {
            type: "PlutusV2",
            script: ownerValidator.compiledCode
        },
        countValidator: {
            type: "PlutusV2",
            script: countValidator.compiledCode
        },
        secureCountValidator: {
            type: "PlutusV2",
            script: secureCountValidator.compiledCode
        },
        countMintingPolicy: {
            type: "PlutusV2",
            script: countMintingPolicy.compiledCode
        },
        guessMintingPolicy: {
            type: "PlutusV2",
            script: guessMintingPolicy.compiledCode
        }
    }
}