# Supabase Setup

This folder will contain database migrations, seed data, and RLS policies for the IncluHub Education Management Dashboard.

## Structure

- migrations/ → SQL migration files
- seed/ → sample seed data
- policies/ → Supabase RLS policy notes or SQL files

## MVP Database Rules

- No payment gateway tables
- No public signup
- Role comes from profiles table
- RLS must protect student, educator, external member, team, portfolio, project, and notification data
