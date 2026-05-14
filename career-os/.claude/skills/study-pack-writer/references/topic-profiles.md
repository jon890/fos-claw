# Topic Profiles

This file defines the intended shape of study packs by topic family.

## MySQL / Database Performance Topics

Use for topics like:
- explain-plan
- composite-index
- innodb-mvcc
- transaction-lock
- covering-index

Must emphasize:
- query shape and execution cost
- index-hit vs non-index-hit scenarios
- rows/cardinality/selectivity reasoning
- EXPLAIN / EXPLAIN ANALYZE when relevant
- runnable SQL practice
- backend interview answer framing

Suggested output paths:
- `database/mysql/<topic>.md`
- or `database/<topic>.md` for more generic DB concepts

## Redis Topics

Use for topics like:
- redis-cache-aside
- distributed-lock
- rate-limiting
- pub-sub

Must emphasize:
- caching pattern intent
- consistency tradeoffs
- expiration / eviction / stampede handling
- failure mode examples
- local practice with docker or local Redis
- interview tradeoff answers

Suggested output paths:
- `database/redis/<topic>.md`

## Kafka Topics

Use for topics like:
- kafka-design
- consumer-group
- delivery-semantics
- partition-key

Must emphasize:
- partitioning and ordering
- offset management
- failure/retry behavior
- producer/consumer tradeoffs
- docker-based hands-on practice
- architecture and interview framing

Suggested output paths:
- `kafka/<topic>.md`

## Spring / JPA Topics

Use for topics like:
- jpa-n+1
- spring-transaction
- dirty-checking
- flush-and-clear

Must emphasize:
- generated SQL verification
- transaction boundary effects
- flush timing and consistency
- practical debugging with logs and DB plan inspection
- interview framing around tradeoffs, not slogans

Suggested output paths:
- `java/spring/<topic>.md`
