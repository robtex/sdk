# @robtex/sdk

Lightweight TypeScript SDK for the [Robtex](https://robtex.com) API. DNS, IP, AS, Bitcoin, and Lightning Network intelligence.

- Zero dependencies
- Full TypeScript types
- Works everywhere: Node, Deno, Bun, Cloudflare Workers, browsers
- 55 endpoints covering DNS, passive DNS, IP reputation, geolocation, BGP, domain analysis, Bitcoin, and Lightning Network

## Install

```bash
npm install @robtex/sdk
```

## Quick Start

```typescript
import { Robtex } from '@robtex/sdk';

const api = new Robtex();

// DNS lookup
const dns = await api.lookupDns({ hostname: 'google.com' });

// IP reputation — check against 100+ blocklists
const rep = await api.ipReputation({ ip: '8.8.8.8' });

// Passive DNS — find all records for a domain
const pdns = await api.pdnsForward({ domain: 'example.com' });

// Bitcoin address lookup
const addr = await api.lookupBitcoinAddress({ address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' });
```

## Authentication (Optional)

Works without any key (rate-limited to 10 req/hr). Three options for higher limits:

```typescript
// Free — no key, 10 req/hr
const api = new Robtex();

// Pro API key — higher limits
const api = new Robtex({ apiKey: 'your-key' });

// RapidAPI key — managed billing, plans from $19/mo
const api = new Robtex({ rapidApiKey: 'your-rapidapi-key' });
```

Get a RapidAPI key at https://rapidapi.com/robtex/api/robtex

## Multi-step Investigation Example

```typescript
import { Robtex } from '@robtex/sdk';

const api = new Robtex();

// Investigate a domain: DNS + IP reputation + shared hosting
const dns = await api.lookupDns({ hostname: 'suspicious-site.com' });
const ip = dns.records.find(r => r.type === 'A')?.value;

if (ip) {
  const [reputation, shared, geo] = await Promise.all([
    api.ipReputation({ ip }),
    api.domainSharedIp({ hostname: 'suspicious-site.com' }),
    api.ipGeolocation({ ip }),
  ]);
  console.log({ dns, ip, reputation, shared, geo });
}
```

## All Methods

### DNS
| Method | Description |
|--------|-------------|
| `lookupDns({ hostname })` | All DNS records for a hostname |
| `dnsA({ hostname })` | A records |
| `dnsAAAA({ hostname })` | AAAA records |
| `dnsMx({ hostname })` | MX records |
| `dnsNs({ hostname })` | NS records |
| `dnsTxt({ hostname })` | TXT records |
| `dnsCname({ hostname })` | CNAME records |
| `dnsSoa({ hostname })` | SOA record |
| `dnsPtr({ ip })` | PTR record for an IP |

### Reverse DNS
| Method | Description |
|--------|-------------|
| `reverseLookupDnsRecords({ value, type?, limit?, offset? })` | Hostnames using a DNS value |
| `reverseLookupIp({ ip, limit?, offset? })` | Hostnames pointing to an IP |
| `reverseLookupMx({ mx, limit?, offset? })` | Hostnames using a mail server |
| `reverseLookupNs({ nameserver, limit?, offset? })` | Hostnames using a nameserver |
| `reverseLookupCname({ target, limit?, offset? })` | Hostnames CNAMEd to a target |

### Historic Reverse DNS
| Method | Description |
|--------|-------------|
| `historicReverseLookupIp({ ip, limit?, offset? })` | Previously pointed to an IP |
| `historicReverseLookupNs({ nameserver, limit?, offset? })` | Previously used a nameserver |
| `historicReverseLookupMx({ mx, limit?, offset? })` | Previously used a mail server |
| `historicReverseLookupCname({ target, limit?, offset? })` | Previously CNAMEd to a target |

### Passive DNS
| Method | Description |
|--------|-------------|
| `pdnsForward({ domain })` | Domain to DNS records (returns array) |
| `pdnsReverse({ value, type? })` | Value to domains (returns array) |
| `pdnsReverseHistoric({ value, type? })` | Historic reverse pDNS (returns array) |

### IP Intelligence
| Method | Description |
|--------|-------------|
| `ipReputation({ ip })` | Check against 100+ blocklists |
| `ipGeolocation({ ip })` | Country, city, coordinates |
| `ipNetwork({ ip })` | BGP route, ASN |
| `ipToAsn({ ip })` | Map IP to AS number |
| `ipBlocklistCheck({ ip })` | Threat intel blocklists (FireHOL, IPsum) |
| `ipThreatIntel({ ip })` | AbuseIPDB, CIRCL BGP ranking |

### Legacy IP/AS
| Method | Description |
|--------|-------------|
| `ipquery({ ip })` | Classic IP query (DNS + geo + network) |
| `asquery({ asn })` | Networks for an AS number |

### AS / Routing
| Method | Description |
|--------|-------------|
| `asInfo({ asn })` | AS name and organization |
| `asPrefixes({ asn })` | Announced BGP prefixes |
| `lookupAsWhois({ asn })` | AS WHOIS information |

### Domain Analysis
| Method | Description |
|--------|-------------|
| `domainReputation({ hostname })` | Reputation and threat data |
| `domainRanking({ hostname })` | Popularity (Tranco, Majestic, Umbrella, CrUX) |
| `domainBlocklistCheck({ hostname })` | DNS blocklist check |
| `domainSharedIp({ hostname, limit? })` | Domains on same IP |
| `domainSharedNs({ hostname, limit? })` | Domains with same nameservers |
| `domainSharedMx({ hostname, limit? })` | Domains with same mail server |

### Hostname Utilities
| Method | Description |
|--------|-------------|
| `parseHostname({ hostname })` | Parse into eTLD, domain, subdomain |
| `isSubdomain({ hostname })` | Check if subdomain |
| `registeredDomain({ hostname })` | Extract registered domain |
| `tldInfo({ tld })` | TLD information |

### Lightning Network
| Method | Description |
|--------|-------------|
| `lookupLightningNode({ pubkey })` | Node info by public key |
| `lookupLightningChannel({ short_channel_id })` | Channel info |
| `lookupLightningChannelsPerNode({ pubkey, limit?, offset? })` | Channels for a node |
| `getRecommendedLightningPeers({ pubkey, count? })` | Peer recommendations |
| `searchLightningNodesByAlias({ alias, limit? })` | Search nodes by name |
| `latestLightningChannels({ count? })` | Recently opened channels |

### Bitcoin
| Method | Description |
|--------|-------------|
| `lookupBitcoinTransaction({ txid })` | Transaction details |
| `lookupBitcoinAddress({ address })` | Address info and balance |
| `lookupBitcoinBlock({ height })` | Block details |
| `bitcoinAddressTransactions({ address, limit?, offset? })` | Transaction history |
| `bitcoinTransactionSpends({ txid })` | Spending transactions |
| `bitcoinBlockchainStats({ start_height, end_height })` | Block range statistics |

### Utility
| Method | Description |
|--------|-------------|
| `lookupMac({ mac })` | MAC address vendor (IEEE OUI) |
| `checkEmail({ email })` | Email verification via SMTP |
| `ping()` | API health check |

## Generic Call

For any endpoint, including future ones:

```typescript
const result = await api.call('some_endpoint', { param1: 'value' });
```

## Error Handling

```typescript
import { Robtex, RobtexError } from '@robtex/sdk';

const api = new Robtex();
try {
  await api.ipReputation({ ip: '8.8.8.8' });
} catch (e) {
  if (e instanceof RobtexError && e.status === 429) {
    console.log(`Rate limited. Retry after ${e.retryAfter}s`);
  }
}
```

## Custom Fetch

Pass your own fetch for proxies, logging, or testing:

```typescript
const api = new Robtex({
  fetch: (url, init) => {
    console.log('Fetching:', url);
    return globalThis.fetch(url, init);
  },
});
```

## Links

- [Robtex](https://robtex.com) — Web interface
- [API Docs](https://freeapi.robtex.com/api-docs.json) — OpenAPI spec
- [MCP Server](https://mcp.robtex.com) — Model Context Protocol
- [RapidAPI](https://rapidapi.com/robtex/api/robtex) — Managed API marketplace

## License

MIT
