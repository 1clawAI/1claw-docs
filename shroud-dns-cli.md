# Shroud and Intents DNS setup via Vercel CLI

`https://shroud.1claw.xyz` and `https://intents.1claw.xyz` should point **directly at the Shroud service on Google Cloud (GKE)** (same backend — TEE for LLM proxy and Intents API), not at Vercel.

## 1. Reserve the static IP in GCP (one-time)

The Shroud ingress uses a global static IP named `shroud-ip`:

```bash
gcloud compute addresses create shroud-ip --global --project=YOUR_PROJECT_ID
gcloud compute addresses describe shroud-ip --global --format='get(address)'
# e.g. 34.107.187.243
```

## 2. Point `shroud.1claw.xyz` at that IP in DNS

Use an **A** record so traffic goes straight to GKE. No CNAME to Vercel.

```bash
# Add A record (replace with your actual Shroud GKE IP)
vercel dns add 1claw.xyz shroud A 34.107.187.243
```

Confirm:

```bash
vercel dns ls 1claw.xyz
# Should show: shroud  A  34.107.187.243
```

Check from authoritative DNS:

```bash
dig @ns1.vercel-dns.com shroud.1claw.xyz A +short
# Should print the GKE IP
```

## 2b. Point `intents.1claw.xyz` at the same IP (optional)

The same GKE Ingress serves both hosts. Use the **same static IP** as Shroud:

```bash
# Same IP as shroud (e.g. from step 1)
vercel dns add 1claw.xyz intents A 34.107.187.243
```

Confirm:

```bash
dig @ns1.vercel-dns.com intents.1claw.xyz A +short
# Should print the same GKE IP as shroud.1claw.xyz
```

Then `https://intents.1claw.xyz/v1/agents/:id/transactions` and other Intents API paths hit the TEE directly (same backend as `shroud.1claw.xyz`).

## 3. Do not use CNAME or Vercel alias for shroud or intents

- **Do not** add a CNAME `shroud` or `intents` → Vercel; that would send traffic to the dashboard.
- **Do not** run `vercel alias set ... shroud.1claw.xyz` or `... intents.1claw.xyz`; that would claim the hostname for a Vercel deployment.

If you previously added a CNAME or alias, remove them:

```bash
# Remove CNAME (get record id from vercel dns ls 1claw.xyz)
vercel dns rm <record-id>

# Remove alias if present
vercel alias remove shroud.1claw.xyz
```

Then add the A record as in step 2.

## Troubleshooting: "Empty reply from server" or curl (52)

If `curl -ILk https://shroud.1claw.xyz` returns **empty reply from server** (exit 52), the connection reaches the GKE load balancer but TLS or the backend isn’t responding. Check:

1. **ManagedCertificate**  
   The Ingress uses `networking.gke.io/managed-certificates: "shroud-cert"`. A `ManagedCertificate` named `shroud-cert` must exist in namespace `shroud-system` with domains `shroud.1claw.xyz` and `intents.1claw.xyz`. Apply `shroud/k8s/managed-certificate.yaml` if missing. Provisioning can take **up to 60 minutes**.
   ```bash
   kubectl get managedcertificate -n shroud-system
   kubectl describe managedcertificate shroud-cert -n shroud-system
   # Wait until Status.CertificateStatus is Active
   ```

2. **Pods and backend**  
   Ensure Shroud pods are Running and Ready so the load balancer has healthy backends.
   ```bash
   kubectl get pods -n shroud-system
   kubectl describe ingress shroud-ingress -n shroud-system
   ```

3. **Backend protocol**  
   Shroud listens on 8443 with **HTTP** (no TLS). The GCE Ingress terminates TLS and forwards HTTP to the service; no change needed if the Service targets port 8443.

## Useful commands

| Command | Purpose |
|--------|---------|
| `vercel dns ls 1claw.xyz` | List DNS records |
| `vercel dns rm <id>` | Remove a DNS record by id |
| `vercel alias list` | List aliases (remove shroud if present) |
| `dig @ns1.vercel-dns.com shroud.1claw.xyz A +short` | Verify Shroud A record |
| `dig @ns1.vercel-dns.com intents.1claw.xyz A +short` | Verify Intents A record (same IP) |
