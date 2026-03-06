import { PublicKey } from "@solana/web3.js";

export function deriveOrgPda(
  creator: PublicKey,
  name: string,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("organization"), creator.toBuffer(), Buffer.from(name)],
    programId
  );
}

export function deriveRolePda(
  org: PublicKey,
  index: number,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("role"), org.toBuffer(), Buffer.from([index])],
    programId
  );
}

export function deriveMembershipPda(
  org: PublicKey,
  member: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("membership"), org.toBuffer(), member.toBuffer()],
    programId
  );
}

export function deriveVaultPda(
  org: PublicKey,
  label: string,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), org.toBuffer(), Buffer.from(label)],
    programId
  );
}