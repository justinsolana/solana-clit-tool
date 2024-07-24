import argparse
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solana.rpc.api import Client
from solana.transaction import Transaction
from solders.system_program import TransferParams, transfer
import base58
import os

# Initialize the Solana Client
solana_client = Client("https://api.devnet.solana.com", "confirmed")

def create_keypair():
    keypair = Keypair()
    public_key = keypair.pubkey()
    private_key = keypair.secret()
    print(f"Public Key: {public_key}")
    print(f"Private Key: {base58.b58encode(private_key).decode()}")
    save_keypair(keypair)
    return keypair

def save_keypair(keypair):
    with open(os.path.expanduser('~/.config/solana/id.json'), 'w') as f:
        f.write(str(list(keypair.secret())))

def request_airdrop(public_key, amount):
    response = Client.request_airdrop(public_key, amount,  1000000000) # Convert SOL to lamports
    print(f"Airdrop response: {response}")

def send_sol(sender_keypair, recipient_public_key, amount):
    transaction = Transaction().add(
        transfer(
            TransferParams(
                from_pubkey=sender_keypair.public_key,
                to_pubkey=PublicKey(recipient_public_key),
                lamports=amount * 1000000000  # Convert SOL to lamports
            )
        )
    )
    response = solana_client.send_transaction(transaction, sender_keypair)
    print(f"Transaction response: {response}")

def main():
    parser = argparse.ArgumentParser(description="Solana CLI Tool")
    subparsers = parser.add_subparsers(dest="command")

    create_parser = subparsers.add_parser("create", help="Create a new keypair")

    airdrop_parser = subparsers.add_parser("airdrop", help="Request an airdrop")
    airdrop_parser.add_argument("public_key", type=str, help="Public key to airdrop SOL to")
    airdrop_parser.add_argument("amount", type=int, help="Amount of SOL to airdrop")

    send_parser = subparsers.add_parser("send", help="Send SOL to another public key")
    send_parser.add_argument("recipient_public_key", type=str, help="Recipient's public key")
    send_parser.add_argument("amount", type=int, help="Amount of SOL to send")

    args = parser.parse_args()

    if args.command == "create":
        create_keypair()
    elif args.command == "airdrop":
        request_airdrop(args.public_key, args.amount)
    elif args.command == "send":
        with open(os.path.expanduser('~/.config/solana/id.json'), 'r') as f:
            secret_key = eval(f.read())
        sender_keypair = Keypair.from_secret_key(bytes(secret_key))
        send_sol(sender_keypair, args.recipient_public_key, args.amount)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()