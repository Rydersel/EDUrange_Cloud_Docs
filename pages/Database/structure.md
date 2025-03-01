# EDURange Cloud Database Structure

## Overview

EDURange Cloud uses a PostgreSQL database managed through Prisma ORM. The database serves as the central data store for the platform, handling user information, challenges, competitions, and activity tracking. The database is designed to support the educational cybersecurity platform with a focus on competition management and challenge tracking.

## Architecture

The database system consists of three main components:

1. **PostgreSQL Database**: The primary data store running as a standalone service
2. **Database API**: REST API for database interactions
3. **Database Sync**: Background service that synchronizes Kubernetes pod state with the database

These components run in the Kubernetes cluster as part of the `database-controller` deployment.

## Core Entities

### Users and Authentication

- **User**: Central entity storing user profiles, authentication details, and role information
- **Account**: OAuth provider accounts linked to users
- **Session**: User session data for authentication persistence
- **VerificationToken**: Used for email verification and password resets

### Competition Management

- **CompetitionGroup**: Represents a competition or class with start/end dates and member management
- **CompetitionAccessCode**: Codes that allow users to join competition groups
- **GroupPoints**: Tracks points earned by users within specific competition groups

### Challenge System

- **Challenges**: Defines available cybersecurity challenges with metadata
- **ChallengeType**: Categorizes challenges by type
- **ChallengeInstance**: Represents a running instance of a challenge for a specific user
- **GroupChallenge**: Links challenges to competition groups with point values
- **ChallengeCompletion**: Records when users complete entire challenges

### Question and Assessment

- **ChallengeQuestion**: Individual questions within challenges
- **QuestionAttempt**: Records of user attempts to answer questions
- **QuestionCompletion**: Tracks successfully completed questions

### Activity Tracking

- **ActivityLog**: Comprehensive event logging system for user actions and system events

## Key Relationships

- Users can be members or instructors of multiple competition groups
- Competition groups contain multiple challenges with customized point values
- Challenges contain multiple questions with individual point values
- Challenge instances are linked to specific users and competition groups
- Activity logs track actions across the entire system with references to relevant entities

## Database Management

The database is managed through:

1. **Prisma Schema**: Defines the data model and relationships
2. **Database Controller**: Kubernetes deployment with API and sync services
3. **Health Monitoring**: System health checks track database status and performance

## Synchronization

The database-sync service continuously:

1. Retrieves challenge pod information from Kubernetes
2. Updates the database to reflect the current state of running challenges
3. Removes database entries for terminated challenge instances
4. Ensures consistency between the Kubernetes cluster and database records

## Access Patterns

- The Next.js frontend accesses the database through Prisma Client
- The Instance Manager interacts with the database via the Database API
- System components monitor database health through dedicated endpoints

## Schema Evolution

Database schema changes are managed through Prisma migrations, allowing for:

- Version-controlled schema updates
- Safe application of schema changes
- Rollback capabilities for failed migrations

## Security Considerations

- Role-based access control (ADMIN, INSTRUCTOR, STUDENT)
- Cascading deletes to maintain referential integrity
- Comprehensive activity logging for audit trails 
