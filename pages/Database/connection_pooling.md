# Database Connection Pooling

## Overview

EDURange Cloud uses PgBouncer for database connection pooling to improve performance and scalability. Connection pooling allows efficient sharing of database connections among multiple clients, reducing the overhead of establishing new connections and improving application performance.

## Architecture

```mermaid
graph TD
    subgraph "Platform Components"
        D[Dashboard]
        W[WebOS]
        IM[Instance Manager]
        MS[Monitoring Service]
    end
    
    subgraph "Database Controller"
        DBAPI[Database API]
        DBSYNC[Database Sync]
    end
    
    subgraph "Database Services"
        PGB[PgBouncer]
        PSQL[PostgreSQL]
    end
    
    D -->|pooled connection| PGB
    W -->|pooled connection| PGB
    IM -->|pooled connection| PGB
    MS -->|pooled connection| PGB
    
    DBAPI -->|direct connection| PSQL
    DBSYNC -->|direct connection| PSQL
    
    PGB -->|managed connections| PSQL
    
    style PGB fill:#f9f,stroke:#333,stroke-width:2px
    style DBAPI fill:#bbf,stroke:#333,stroke-width:2px
    style DBSYNC fill:#bbf,stroke:#333,stroke-width:2px
```

## Connection Strategies

EDURange Cloud employs different connection strategies for different components:

### Pooled Connections

Most platform components connect to the database through PgBouncer:

- **Dashboard**: Web interface for administrators, instructors, and students
- **[WebOS](../Framework/WebOS/Introduction)**: Browser-based desktop environment for challenges
- **[Instance Manager](../Framework/Instance_Manager)**: Manages challenge instances in Kubernetes
- **[Monitoring Service](../Framework/Monitoring_System)**: Tracks system health and metrics

These components benefit from connection pooling because:
- They have intermittent database access patterns
- They don't require long-running transactions
- They can share a pool of connections efficiently
- They don't need specialized connection settings

### Direct Connections

The Database Controller uses direct connections to PostgreSQL:

- **Database API**: Provides endpoints for database operations
- **Database Sync**: Synchronizes challenge state between Kubernetes and the database

Direct connections are used for these components because:
- They require consistent transaction isolation
- They perform continuous operations that benefit from persistent connections
- They need maximum reliability for critical operations
- They may require specialized session configurations

## PgBouncer Configuration

PgBouncer is configured to optimize connection handling for the EDURange Cloud workload:

### Connection Pooling Modes

PgBouncer operates in **transaction pooling mode**, which means connections are assigned to clients only for the duration of a transaction. This mode offers the best balance between efficiency and compatibility for the EDURange Cloud platform.

Available pooling modes:
- **Session pooling**: Client holds connection until disconnection (less efficient)
- **Transaction pooling**: Client holds connection for a single transaction (current setting)
- **Statement pooling**: Client holds connection for a single statement (more restrictive)

### Key Configuration Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `max_client_conn` | 1000 | Maximum number of client connections |
| `default_pool_size` | 50 | Default size of each pool |
| `min_pool_size` | 10 | Minimum number of connections maintained in the pool |
| `reserve_pool_size` | 20 | Connections to reserve for when pool is depleted |
| `reserve_pool_timeout` | 5 | Seconds to wait before using reserved connections |
| `max_db_connections` | 100 | Maximum connections to the database |
| `idle_transaction_timeout` | 60 | Seconds to wait before closing idle connections |
| `server_lifetime` | 3600 | Maximum lifetime in seconds of server connections |

### Pool Assignments

Connection pools are assigned based on username, database, and application:

```
[pools]
edurange_dashboard_prod = host=postgres dbname=edurange pool_size=30 min_pool_size=5
edurange_webos_prod = host=postgres dbname=edurange pool_size=20 min_pool_size=5
edurange_instance_manager_prod = host=postgres dbname=edurange pool_size=20 min_pool_size=5
edurange_monitoring_service_prod = host=postgres dbname=edurange pool_size=10 min_pool_size=3
```

## Kubernetes Deployment

PgBouncer runs as a dedicated service in the Kubernetes cluster with the following specification:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pgbouncer
  template:
    metadata:
      labels:
        app: pgbouncer
    spec:
      containers:
      - name: pgbouncer
        image: registry.rydersel.cloud/pgbouncer:latest
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: pgbouncer-config
          mountPath: /etc/pgbouncer
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
      volumes:
      - name: pgbouncer-config
        configMap:
          name: pgbouncer-config
---
apiVersion: v1
kind: Service
metadata:
  name: pgbouncer
  namespace: default
spec:
  selector:
    app: pgbouncer
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
```

## Monitoring and Maintenance

### Monitoring Metrics

The following metrics are monitored to ensure optimal operation:

- **Client Connections**: Current and maximum number of client connections
- **Server Connections**: Current and maximum number of server connections
- **Pool Status**: Number of active, idle, and used connections per pool
- **Transaction Statistics**: Number of transactions, queries, and average transaction time
- **Wait Times**: Time clients spend waiting for connections

### Common Issues and Troubleshooting

#### Connection Limit Errors

If components cannot connect due to "too many connections", consider:
- Increasing `max_client_conn` in PgBouncer
- Checking for connection leaks in application code
- Reviewing connection timeout settings

#### Poor Performance

If queries are slow or timeouts occur:
- Check database server load
- Review PgBouncer logs for queue buildup
- Adjust pool sizes based on usage patterns
- Consider query optimization or indexing

#### Administration Commands

PgBouncer can be administered through the PgBouncer console:

```sql
-- Connect to PgBouncer admin console
psql -p 5432 -h pgbouncer -U pgbouncer pgbouncer

-- View active clients and servers
SHOW CLIENTS;
SHOW SERVERS;

-- View pool status
SHOW POOLS;

-- Reload configuration
RELOAD;

-- Pause/resume pool (for maintenance)
PAUSE [pool];
RESUME [pool];
```

## Connection String Configuration

Applications connect to PgBouncer instead of directly to PostgreSQL by modifying their connection strings:

### Before (Direct PostgreSQL Connection)
```
DATABASE_URL=postgresql://edurange_user:password@postgres:5432/edurange
```

### After (PgBouncer Connection)
```
DATABASE_URL=postgresql://edurange_user:password@pgbouncer:5432/edurange?application_name=edurange_dashboard_prod
```

The `application_name` parameter helps PgBouncer route connections to the appropriate pool and enables better monitoring of connection sources. 
