# R3VL + Turnkey Swimlane

```mermaid
sequenceDiagram
  autonumber
  participant User as User
  participant WhatsApp as WhatsApp
  participant R3VL as R3VL Agent / Backend
  participant App as R3VL Web/App Session
  participant Turnkey as Turnkey Wallet Kit
  participant Wallet as MetaMask / WalletConnect
  participant Chain as Blockchain
  participant Recipient as Recipient

  rect rgb(232, 247, 239)
    User->>WhatsApp: "Send Samuel $20"
    WhatsApp->>R3VL: Message + WhatsApp phone identity
    R3VL->>R3VL: Resolve phone number -> verified wallet/payment ID
    R3VL->>R3VL: Resolve Samuel -> recipient wallet address
  end

  rect rgb(232, 237, 255)
    R3VL->>App: Open secure confirmation session
    App->>Turnkey: Read connected external wallet account
    alt Wallet not connected yet
      App->>Turnkey: handleConnectExternalWallet()
      Turnkey->>Wallet: Request external wallet connection
      Wallet->>User: Native wallet connection prompt
      User->>Wallet: Approves connection
      Wallet-->>Turnkey: Connected wallet address
    end
  end

  rect rgb(255, 232, 237)
    R3VL->>App: Provide unsigned transaction details
    App->>Turnkey: signTransaction / signAndSendTransaction with connected walletAccount
    Turnkey->>Wallet: Request wallet-native approval
    Wallet->>User: MetaMask / WalletConnect confirmation UI
    User->>Wallet: Approves signature / transaction
  end

  rect rgb(228, 248, 246)
    Wallet->>Chain: Submit signed transaction
    Chain->>Recipient: Funds move directly wallet-to-recipient
    Chain-->>R3VL: Transaction hash / status
    R3VL-->>WhatsApp: Send payment confirmation
    WhatsApp-->>User: "Sent $20 to Samuel"
  end

  Note over R3VL,Turnkey: R3VL owns WhatsApp identity, phone-to-wallet mapping, recipient resolution, and transaction construction.
  Note over Turnkey,Wallet: Turnkey enables external wallet connection and routes signing to the connected wallet.
  Note over Wallet,Chain: Wallet owns the confirmation UI and signature. Funds do not pass through a Turnkey-managed wallet.
  Note over WhatsApp,Wallet: Constraint: WhatsApp can initiate the flow, but MetaMask/WalletConnect signing needs a secure app or wallet-capable session.
```

## Takeaway

R3VL can keep the requested non-custodial, bring-your-own-wallet flow. Turnkey supports the external wallet connection and signing layer; R3VL owns the WhatsApp identity, recipient resolution, and transaction orchestration.

The only implementation constraint is that WhatsApp cannot directly open the MetaMask confirmation UI. The clean pattern is a secure R3VL web/app session where the connected wallet signs and funds move directly from the user's wallet to the recipient.
