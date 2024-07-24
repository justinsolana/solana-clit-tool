#!/usr/bin/env node

const { Keypair, Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const argv = require('yargs/yargs')(process.argv.slice(2)).argv;

const CONFIG_DIR = path.join(os.homedir(), '.config', 'solana');
const KEYPAIR_PATH = path.join(CONFIG_DIR, 'id.json');

// Ensure the config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function createKeypair() {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const secretKey = JSON.stringify(Array.from(keypair.secretKey));

    fs.writeFileSync(KEYPAIR_PATH, secretKey);
    console.log(`Public Key: ${publicKey}`);
    console.log(`Private Key saved to ${KEYPAIR_PATH}`);
}

async function requestAirdrop(publicKeyString, amount) {
    const publicKey = new PublicKey(publicKeyString);
    const airdropSignature = await connection.requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSignature);
    console.log(`Airdropped ${amount} SOL to ${publicKeyString}`);
}

async function sendSol(recipientPublicKeyString, amount) {
    const secretKey = JSON.parse(fs.readFileSync(KEYPAIR_PATH));
    const senderKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    const recipientPublicKey = new PublicKey(recipientPublicKeyString);

    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: senderKeypair.publicKey,
            toPubkey: recipientPublicKey,
            lamports: amount * LAMPORTS_PER_SOL,
        })
    );

    const signature = await connection.sendTransaction(transaction, [senderKeypair]);
    await connection.confirmTransaction(signature);
    console.log(`Sent ${amount} SOL to ${recipientPublicKeyString}`);
}

async function main() {
    if (argv._.includes('create')) {
        await createKeypair();
    } else if (argv._.includes('airdrop')) {
        const publicKey = argv.publicKey;
        const amount = argv.amount;
        if (!publicKey || !amount) {
            console.error('Please provide a public key and amount for airdrop.');
            return;
        }
        await requestAirdrop(publicKey, amount);
    } else if (argv._.includes('send')) {
        const recipientPublicKey = argv.recipientPublicKey;
        const amount = argv.amount;
        if (!recipientPublicKey || !amount) {
            console.error('Please provide a recipient public key and amount to send.');
            return;
        }
        await sendSol(recipientPublicKey, amount);
    } else {
        console.log('Usage:');
        console.log('  create                  Create a new keypair');
        console.log('  airdrop --publicKey <publicKey> --amount <amount>   Request an airdrop');
        console.log('  send --recipientPublicKey <publicKey> --amount <amount> Send SOL to another public key');
    }
}

main().catch(err => {
    console.error(err);
});
