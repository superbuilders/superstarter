# Convergence Audit — Phase 4 Sub-Round Bank (post commit 6 resume)

Generated: 2026-05-08T23:52:42.172Z

## Summary

- Total candidates audited: **1748**
- Cells analyzed: **56** (14 sub-types × 4 tiers)

**Cluster aggregates by threshold:**

| threshold | total clusters ≥2 | candidates in clusters ≥2 | % of bank |
|---|---|---|---|
| 0.92 | 48 | 248 | 14.2% |
| 0.95 | 40 | 226 | 12.9% |
| 0.97 | 36 | 215 | 12.3% |

**Top 10 cells by largest-cluster size at threshold 0.95:**

| rank | sub_type | tier | n | largest cluster | candidates in clusters ≥2 |
|---|---|---|---|---|---|
| 1 | numerical.lowest_values | brutal | 40 | 29 | 39 |
| 2 | numerical.lowest_values | hard | 40 | 29 | 39 |
| 3 | numerical.lowest_values | easy | 40 | 28 | 39 |
| 4 | numerical.lowest_values | medium | 40 | 28 | 39 |
| 5 | verbal.antonyms | brutal | 35 | 13 | 19 |
| 6 | verbal.antonyms | medium | 35 | 6 | 10 |
| 7 | verbal.antonyms | hard | 35 | 5 | 10 |
| 8 | verbal.antonyms | easy | 35 | 4 | 14 |
| 9 | numerical.number_series | easy | 49 | 3 | 9 |
| 10 | numerical.averages | medium | 18 | 2 | 2 |

## Convergence summary by sub-type (14 rows; aggregated across 4 tiers; threshold = 0.95)

| sub_type | total candidates | clusters ≥2 | candidates in clusters ≥2 | % | note |
|---|---|---|---|---|---|
| numerical.averages | 72 | 1 | 2 | 2.8% | minor noise |
| numerical.fractions | 36 | 0 | 0 | 0.0% | no convergence |
| numerical.lowest_values | 160 | 16 | 156 | 97.5% | TEMPLATING ARTIFACT (expected high cosine) |
| numerical.number_series | 196 | 5 | 11 | 5.6% | real convergence |
| numerical.percentages | 132 | 0 | 0 | 0.0% | no convergence |
| numerical.ratios | 64 | 0 | 0 | 0.0% | no convergence |
| numerical.speed_distance_time | 68 | 0 | 0 | 0.0% | no convergence |
| numerical.word_problems | 116 | 0 | 0 | 0.0% | no convergence |
| numerical.workrate | 60 | 1 | 2 | 3.3% | minor noise |
| verbal.analogies | 172 | 0 | 0 | 0.0% | no convergence |
| verbal.antonyms | 140 | 16 | 53 | 37.9% | real convergence |
| verbal.critical_reasoning | 232 | 0 | 0 | 0.0% | no convergence |
| verbal.letter_series | 64 | 1 | 2 | 3.1% | PARTIAL TEMPLATING (some legitimate near-matches) |
| verbal.sentence_completion | 236 | 0 | 0 | 0.0% | no convergence |

## Per-cell results (56 cells)

### numerical.averages | brutal

- n = 18
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.averages | easy

- n = 18
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.averages | hard

- n = 18
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.averages | medium

- n = 18
- 0.92: clusters≥2=1, largest=2, in-clusters=2
- 0.95: clusters≥2=1, largest=2, in-clusters=2
- 0.97: clusters≥2=0, largest=1, in-clusters=0

Clusters at threshold 0.95 (size ≥ 2):
- **Cluster #1** (size=2, sim p50=0.9519, max=0.9519)
  - `019e095a-3ea8-7a4d-890a-050af8dc3d25` (parent=019dfd96-261b-7585-a3c8-50736f7bd136) — "Five runners completed a race. Their average finish time was…"
  - `019e09d6-28e6-7627-932e-5fb4877a7e1b` (parent=019dfd91-6e82-7adf-b088-54108af47f36) — "5 runners completed a race with an average time of 48 minute…"

### numerical.fractions | brutal

- n = 9
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.fractions | easy

- n = 9
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.fractions | hard

- n = 9
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.fractions | medium

- n = 9
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.lowest_values | brutal

- n = 40
- 0.92: clusters≥2=4, largest=29, in-clusters=40
- 0.95: clusters≥2=4, largest=29, in-clusters=39
- 0.97: clusters≥2=4, largest=29, in-clusters=39

> **TEMPLATING ARTIFACT** — body intrinsically templated; high cosine expected (pairwise p50 = 1.0000 per c4d8541 audit)

Clusters at threshold 0.95 (size ≥ 2):
- **Cluster #1** (size=29, sim p50=1.0000, max=1.0000)
  - `019e0951-55c5-7210-b75d-76eb5578f8e3` (parent=019dfd93-6750-7586-b972-050b100c2aec) — "Which number has the lowest value?…"
  - `019e0951-969d-70b8-8a1b-671efda3c9db` (parent=019dfd93-7db3-7967-8c78-5a0f489f1e35) — "Which number has the lowest value?…"
  - `019e0951-e191-794c-9bf6-c4fd3d6d10e5` (parent=019dfd93-961e-7f78-b1fc-2cd42597b573) — "Which number has the lowest value?…"
  - `019e0952-2abe-790c-b38f-5432fd81201c` (parent=019dfd93-ad70-79dd-850c-69e1cdefc4aa) — "Which number has the lowest value?…"
  - `019e0952-7b0a-74c2-a266-315b6e2beffb` (parent=019dfd93-c94e-70d8-ad3d-88fd0f84558a) — "Which number has the lowest value?…"
  - `019e0952-bc5b-7729-a882-6f69b1458fa3` (parent=019dfd93-e086-7c0e-90ed-b8b1019de346) — "Which number has the lowest value?…"
  - `019e0953-6b3e-7180-a545-1d6696dc9567` (parent=019dfd94-13b3-7e92-b50c-63b0a731c6a6) — "Which number has the lowest value?…"
  - `019e0953-c9d1-7443-964f-d4fcc63cd204` (parent=019dfd94-2bb3-7209-ad71-b98a2776fb62) — "Which number has the lowest value?…"
  - `019e0954-1599-7919-8461-658ed9383016` (parent=019dfd94-43b1-7ead-9563-607e533c9594) — "Which number has the lowest value?…"
  - `019e0954-74a1-708e-8659-1e7c6741d93e` (parent=019dfd94-5e1a-7eef-be4a-34f3bef1f246) — "Which number has the lowest value?…"
  - `019e0958-bf5d-7207-a527-305171311cb4` (parent=019dfd95-c017-7999-aec5-8bcff819c2d7) — "Which number has the lowest value?…"
  - `019e0959-d1c2-7564-ba43-b01ce8e9272f` (parent=019dfd96-0db5-722c-8f3a-f62b449fc4bb) — "Which number has the lowest value?…"
  - `019e095c-e4ae-7040-b05f-ed4b4baf066b` (parent=019dfd96-daf6-78fd-adb3-6239ae72d485) — "Which number has the lowest value?…"
  - `019e0962-fc4b-7f4d-961e-804e33d9bb01` (parent=019dfd98-8db3-7661-a945-70c0b89b8758) — "Which number has the lowest value?…"
  - `019e0963-474b-7a25-976f-c46440b24b3b` (parent=019dfd98-a6e3-7950-b780-49034a8a8c31) — "Which number has the lowest value?…"
  - `019e0964-0fe7-73e7-a592-4c77a78ad6b2` (parent=019dfd98-dbb0-73f7-a401-9d00f9af88fa) — "Which number has the lowest value?…"
  - `019e0964-67e7-7057-941b-3ec39456ad85` (parent=019dfd98-f3b2-7c0e-bf9c-b3fd84608c2e) — "Which number has the lowest value?…"
  - `019e0964-b15b-7afc-b8db-a3a498b7ccbf` (parent=019dfd99-0d4b-7ed2-8758-5a687bf63c90) — "Which number has the lowest value?…"
  - `019e0985-650c-7aef-8d3a-6e64494de46d` (parent=019dfda1-d5ae-73fc-9e76-6b03db8bdae6) — "Which number has the lowest value?…"
  - `019e098b-788a-7667-a48a-8c4d7ca9fd3c` (parent=019dfda3-77e3-7934-aa5d-0cf8f7ba131d) — "Which number has the lowest value?…"
  - `019e098b-d5bd-7aa7-93d6-8685d741a009` (parent=019dfda3-a1f0-79ec-96c4-f903d32009e1) — "Which number has the lowest value?…"
  - `019e098e-d42b-7ab1-b158-343563fe2247` (parent=019dfda4-5705-77d2-9af6-867d339f440e) — "Which number has the lowest value?…"
  - `019e098f-2381-7396-898a-3e5b26e5ee26` (parent=019dfda4-7214-7b36-a256-c3b8b8c2969b) — "Which number has the lowest value?…"
  - `019e099b-0836-7664-904a-eb9d49c24f61` (parent=019dfda7-5d2f-7de8-a42c-84bb115eeae0) — "Which number has the lowest value?…"
  - `019e09a2-a3d4-709b-a702-12be969876ae` (parent=019dfda9-385d-7199-82bd-48cdd6fc99c8) — "Which number has the lowest value?…"
  - `019e09ac-d277-718c-946a-5511918be226` (parent=019dfdab-d98f-7413-ace1-3796533bb6b6) — "Which number has the lowest value?…"
  - `019e09ad-35c8-7c88-a72c-aa55b0bd3bdf` (parent=019dfdab-f8c3-78ea-99fe-460dea4114db) — "Which number has the lowest value?…"
  - `019e09ad-932a-748b-b0bd-f5372490cff4` (parent=019dfdac-192d-7a4b-b9bf-2b56f30831f7) — "Which number has the lowest value?…"
  - `019e09d7-6437-70d3-a034-eca712406866` (parent=019dfda6-924d-7cf2-aa20-7aae1635aa7f) — "Which number has the lowest value?…"
- **Cluster #2** (size=3, sim p50=1.0000, max=1.0000)
  - `019e0953-1a37-7555-a9e6-d3de66002d94` (parent=019dfd93-f943-7747-b8a5-489b04db75c3) — "Which expression has the lowest value?…"
  - `019e0954-cb84-7ce5-8c87-af45fe882ac6` (parent=019dfd94-787f-7860-b744-ec2aa1f0fa45) — "Which expression has the lowest value?…"
  - `019e098f-83ca-73c8-8f68-d9a553306f98` (parent=019dfda4-8a98-70ce-be1e-73e67ca8a6ab) — "Which expression has the lowest value?…"
- **Cluster #3** (size=4, sim p50=1.0000, max=1.0000)
  - `019e0973-f375-7008-bb53-846aeae97a3c` (parent=019dfd9d-20e1-78ee-9cf6-3b4bda2aaa1a) — "Which number has the highest value?…"
  - `019e0974-b1b0-7e5e-9921-0f5c87a7fb21` (parent=019dfd9d-511b-7401-acc4-d32344c2b177) — "Which number has the highest value?…"
  - `019e097b-c5fa-7e3f-9e73-ecb718ef9274` (parent=019dfd9f-4aa2-752c-ac6d-35ebb1570ff8) — "Which number has the highest value?…"
  - `019e0987-9415-74fc-a052-aa36b8942da9` (parent=019dfda2-7c7e-7f35-ade2-8f7dc0434008) — "Which number has the highest value?…"
- **Cluster #4** (size=3, sim p50=1.0000, max=1.0000)
  - `019e0974-667e-7646-ace9-f4a655496c8b` (parent=019dfd9d-38e1-7f41-ab6d-b3fbeacd669b) — "Which expression has the highest value?…"
  - `019e097f-5943-78a1-8ac6-f25175c3941f` (parent=019dfda0-0bf4-765f-a678-a9fa1203d308) — "Which expression has the highest value?…"
  - `019e0988-02ec-70ff-83d1-711bb570d2f8` (parent=019dfda2-9ddc-7a62-b245-bf23f14548df) — "Which expression has the highest value?…"

### numerical.lowest_values | easy

- n = 40
- 0.92: clusters≥2=4, largest=28, in-clusters=40
- 0.95: clusters≥2=4, largest=28, in-clusters=39
- 0.97: clusters≥2=4, largest=28, in-clusters=39

> **TEMPLATING ARTIFACT** — body intrinsically templated; high cosine expected (pairwise p50 = 1.0000 per c4d8541 audit)

Clusters at threshold 0.95 (size ≥ 2):
- **Cluster #1** (size=28, sim p50=1.0000, max=1.0000)
  - `019e0951-55c4-7ef5-a7f7-0bd52fbcc934` (parent=019dfd93-6750-7586-b972-050b100c2aec) — "Which number has the lowest value?…"
  - `019e0951-969c-7d0f-b1d6-c4dab9ffd108` (parent=019dfd93-7db3-7967-8c78-5a0f489f1e35) — "Which number has the lowest value?…"
  - `019e0951-e191-7181-b0a6-1a108995aafb` (parent=019dfd93-961e-7f78-b1fc-2cd42597b573) — "Which number has the lowest value?…"
  - `019e0952-2abe-73f9-836a-5ca837a73552` (parent=019dfd93-ad70-79dd-850c-69e1cdefc4aa) — "Which number has the lowest value?…"
  - `019e0952-7b0a-70f4-8ce5-b940a26e3494` (parent=019dfd93-c94e-70d8-ad3d-88fd0f84558a) — "Which number has the lowest value?…"
  - `019e0952-bc5b-72a1-935e-434e4cc11473` (parent=019dfd93-e086-7c0e-90ed-b8b1019de346) — "Which number has the lowest value?…"
  - `019e0953-6b3d-7dda-9b7e-ccee310bd46c` (parent=019dfd94-13b3-7e92-b50c-63b0a731c6a6) — "Which number has the lowest value?…"
  - `019e0953-c9d1-7065-a7ac-3f7f63dba2b1` (parent=019dfd94-2bb3-7209-ad71-b98a2776fb62) — "Which number has the lowest value?…"
  - `019e0954-1599-744c-baea-7094c07e2de2` (parent=019dfd94-43b1-7ead-9563-607e533c9594) — "Which number has the lowest value?…"
  - `019e0954-74a0-7951-ab07-6b1d5ba8b6c2` (parent=019dfd94-5e1a-7eef-be4a-34f3bef1f246) — "Which number has the lowest value?…"
  - `019e0958-bf5c-7e37-bcb4-f9c590bd07dc` (parent=019dfd95-c017-7999-aec5-8bcff819c2d7) — "Which number has the lowest value?…"
  - `019e095c-e4ad-7d81-aaa5-c7705d1a3604` (parent=019dfd96-daf6-78fd-adb3-6239ae72d485) — "Which number has the lowest value?…"
  - `019e0962-fc4b-77d7-9c5f-e6494cd00a94` (parent=019dfd98-8db3-7661-a945-70c0b89b8758) — "Which number has the lowest value?…"
  - `019e0963-474b-76d6-bd50-3ac4f0f01cb7` (parent=019dfd98-a6e3-7950-b780-49034a8a8c31) — "Which number has the lowest value?…"
  - `019e0964-0fe6-7daa-b2bf-95ca4b4008ad` (parent=019dfd98-dbb0-73f7-a401-9d00f9af88fa) — "Which number has the lowest value?…"
  - `019e0964-67e6-7b06-a635-b8e4f4d1e1b1` (parent=019dfd98-f3b2-7c0e-bf9c-b3fd84608c2e) — "Which number has the lowest value?…"
  - `019e0964-b15b-772b-bb34-a4c2bc323091` (parent=019dfd99-0d4b-7ed2-8758-5a687bf63c90) — "Which number has the lowest value?…"
  - `019e0985-650c-767e-9dea-e325c9b06984` (parent=019dfda1-d5ae-73fc-9e76-6b03db8bdae6) — "Which number has the lowest value?…"
  - `019e098b-788a-70a9-abde-2ea5e14f75ac` (parent=019dfda3-77e3-7934-aa5d-0cf8f7ba131d) — "Which number has the lowest value?…"
  - `019e098b-d5bd-7803-bf25-72d858c20a85` (parent=019dfda3-a1f0-79ec-96c4-f903d32009e1) — "Which number has the lowest value?…"
  - `019e098e-d42b-7762-a9a5-027b7a37d9ff` (parent=019dfda4-5705-77d2-9af6-867d339f440e) — "Which number has the lowest value?…"
  - `019e098f-2380-7f3d-8229-dc63ac78c7fc` (parent=019dfda4-7214-7b36-a256-c3b8b8c2969b) — "Which number has the lowest value?…"
  - `019e099b-0836-72a6-a00b-314b4b0b9e0a` (parent=019dfda7-5d2f-7de8-a42c-84bb115eeae0) — "Which number has the lowest value?…"
  - `019e09a2-a3d3-7ba8-91a0-1899f443bb5d` (parent=019dfda9-385d-7199-82bd-48cdd6fc99c8) — "Which number has the lowest value?…"
  - `019e09ac-d276-7b9d-b658-b6a05456efba` (parent=019dfdab-d98f-7413-ace1-3796533bb6b6) — "Which number has the lowest value?…"
  - `019e09ad-35c8-792c-817d-8af38c55cd51` (parent=019dfdab-f8c3-78ea-99fe-460dea4114db) — "Which number has the lowest value?…"
  - `019e09ad-932a-7062-b9da-8123fac5ac63` (parent=019dfdac-192d-7a4b-b9bf-2b56f30831f7) — "Which number has the lowest value?…"
  - `019e09d7-6436-7b38-8f49-a63b121358ac` (parent=019dfda6-924d-7cf2-aa20-7aae1635aa7f) — "Which number has the lowest value?…"
- **Cluster #2** (size=3, sim p50=1.0000, max=1.0000)
  - `019e0953-1a37-7044-9c9d-f17bc36ea7bd` (parent=019dfd93-f943-7747-b8a5-489b04db75c3) — "Which expression has the lowest value?…"
  - `019e0954-cb84-7988-9073-f7732fbfd16f` (parent=019dfd94-787f-7860-b744-ec2aa1f0fa45) — "Which expression has the lowest value?…"
  - `019e098f-83c9-7c01-92fa-f08a59017e2f` (parent=019dfda4-8a98-70ce-be1e-73e67ca8a6ab) — "Which expression has the lowest value?…"
- **Cluster #3** (size=5, sim p50=1.0000, max=1.0000)
  - `019e0959-d1c2-71ff-beeb-9b3e90faf5fa` (parent=019dfd96-0db5-722c-8f3a-f62b449fc4bb) — "Which number has the highest value?…"
  - `019e0973-f374-7954-8429-9280ace60a35` (parent=019dfd9d-20e1-78ee-9cf6-3b4bda2aaa1a) — "Which number has the highest value?…"
  - `019e0974-b1b0-7a20-bc5c-20630d0da2bb` (parent=019dfd9d-511b-7401-acc4-d32344c2b177) — "Which number has the highest value?…"
  - `019e097b-c5fa-776c-b5d6-5fb846f36775` (parent=019dfd9f-4aa2-752c-ac6d-35ebb1570ff8) — "Which number has the highest value?…"
  - `019e0987-9415-716f-a644-99fa95efbf24` (parent=019dfda2-7c7e-7f35-ade2-8f7dc0434008) — "Which number has the highest value?…"
- **Cluster #4** (size=3, sim p50=1.0000, max=1.0000)
  - `019e0974-667e-7174-a98f-07bfba7773fd` (parent=019dfd9d-38e1-7f41-ab6d-b3fbeacd669b) — "Which expression has the highest value?…"
  - `019e097f-5943-7404-89ca-4095ed2f38de` (parent=019dfda0-0bf4-765f-a678-a9fa1203d308) — "Which expression has the highest value?…"
  - `019e0988-02eb-7a14-a6d1-468554df40a1` (parent=019dfda2-9ddc-7a62-b245-bf23f14548df) — "Which expression has the highest value?…"

### numerical.lowest_values | hard

- n = 40
- 0.92: clusters≥2=4, largest=29, in-clusters=40
- 0.95: clusters≥2=4, largest=29, in-clusters=39
- 0.97: clusters≥2=4, largest=29, in-clusters=39

> **TEMPLATING ARTIFACT** — body intrinsically templated; high cosine expected (pairwise p50 = 1.0000 per c4d8541 audit)

Clusters at threshold 0.95 (size ≥ 2):
- **Cluster #1** (size=29, sim p50=1.0000, max=1.0000)
  - `019e0951-55c5-71bf-9681-37b150cf8482` (parent=019dfd93-6750-7586-b972-050b100c2aec) — "Which number has the lowest value?…"
  - `019e0951-969d-705f-853c-cecced4102a1` (parent=019dfd93-7db3-7967-8c78-5a0f489f1e35) — "Which number has the lowest value?…"
  - `019e0951-e191-782f-88cc-4ec9bcb8ea59` (parent=019dfd93-961e-7f78-b1fc-2cd42597b573) — "Which number has the lowest value?…"
  - `019e0952-2abe-78b3-96d9-133f620259ae` (parent=019dfd93-ad70-79dd-850c-69e1cdefc4aa) — "Which number has the lowest value?…"
  - `019e0952-7b0a-7467-9222-ef89d82711f2` (parent=019dfd93-c94e-70d8-ad3d-88fd0f84558a) — "Which number has the lowest value?…"
  - `019e0952-bc5b-7680-a6b4-cab60268f063` (parent=019dfd93-e086-7c0e-90ed-b8b1019de346) — "Which number has the lowest value?…"
  - `019e0953-6b3e-7092-a039-89a4b6c6bf86` (parent=019dfd94-13b3-7e92-b50c-63b0a731c6a6) — "Which number has the lowest value?…"
  - `019e0953-c9d1-73a9-9b2a-6a41072e06f9` (parent=019dfd94-2bb3-7209-ad71-b98a2776fb62) — "Which number has the lowest value?…"
  - `019e0954-1599-7867-99ff-c84618a54a23` (parent=019dfd94-43b1-7ead-9563-607e533c9594) — "Which number has the lowest value?…"
  - `019e0954-74a0-7fcc-9dc6-0c8b3fd078c7` (parent=019dfd94-5e1a-7eef-be4a-34f3bef1f246) — "Which number has the lowest value?…"
  - `019e0958-bf5d-718a-9c4a-cf0025ff91d1` (parent=019dfd95-c017-7999-aec5-8bcff819c2d7) — "Which number has the lowest value?…"
  - `019e0959-d1c2-751a-b989-3d8e72243f3d` (parent=019dfd96-0db5-722c-8f3a-f62b449fc4bb) — "Which number has the lowest value?…"
  - `019e095c-e4ad-7ff5-9b5e-d5a8b8902e10` (parent=019dfd96-daf6-78fd-adb3-6239ae72d485) — "Which number has the lowest value?…"
  - `019e0962-fc4b-7e7f-b688-ce4408c5386c` (parent=019dfd98-8db3-7661-a945-70c0b89b8758) — "Which number has the lowest value?…"
  - `019e0963-474b-79d7-a652-103e13c1b31f` (parent=019dfd98-a6e3-7950-b780-49034a8a8c31) — "Which number has the lowest value?…"
  - `019e0964-0fe7-7279-88d0-e33e8e12b95b` (parent=019dfd98-dbb0-73f7-a401-9d00f9af88fa) — "Which number has the lowest value?…"
  - `019e0964-67e6-7f59-899e-61fccd7bc63d` (parent=019dfd98-f3b2-7c0e-bf9c-b3fd84608c2e) — "Which number has the lowest value?…"
  - `019e0964-b15b-7a15-be24-a049fb2675e6` (parent=019dfd99-0d4b-7ed2-8758-5a687bf63c90) — "Which number has the lowest value?…"
  - `019e0985-650c-7a7e-97a1-7b948bae5d52` (parent=019dfda1-d5ae-73fc-9e76-6b03db8bdae6) — "Which number has the lowest value?…"
  - `019e098b-788a-74fc-a73d-38a0e05d4884` (parent=019dfda3-77e3-7934-aa5d-0cf8f7ba131d) — "Which number has the lowest value?…"
  - `019e098b-d5bd-7a5d-975e-40b18a36a5f1` (parent=019dfda3-a1f0-79ec-96c4-f903d32009e1) — "Which number has the lowest value?…"
  - `019e098e-d42b-7a38-927c-682b7fb2e363` (parent=019dfda4-5705-77d2-9af6-867d339f440e) — "Which number has the lowest value?…"
  - `019e098f-2381-7283-b721-1981d4fbc1cd` (parent=019dfda4-7214-7b36-a256-c3b8b8c2969b) — "Which number has the lowest value?…"
  - `019e099b-0836-7582-a196-db8d55bf6cd1` (parent=019dfda7-5d2f-7de8-a42c-84bb115eeae0) — "Which number has the lowest value?…"
  - `019e09a2-a3d4-704b-b4e3-3f9968427217` (parent=019dfda9-385d-7199-82bd-48cdd6fc99c8) — "Which number has the lowest value?…"
  - `019e09ac-d277-7035-9ab7-29f0f692dbcd` (parent=019dfdab-d98f-7413-ace1-3796533bb6b6) — "Which number has the lowest value?…"
  - `019e09ad-35c8-7c39-a137-c2ae38064396` (parent=019dfdab-f8c3-78ea-99fe-460dea4114db) — "Which number has the lowest value?…"
  - `019e09ad-932a-7428-a22c-fb64b4c0d17a` (parent=019dfdac-192d-7a4b-b9bf-2b56f30831f7) — "Which number has the lowest value?…"
  - `019e09d7-6437-7074-8fd7-8e8a232d062a` (parent=019dfda6-924d-7cf2-aa20-7aae1635aa7f) — "Which number has the lowest value?…"
- **Cluster #2** (size=3, sim p50=1.0000, max=1.0000)
  - `019e0953-1a37-747f-84aa-edf2a6ed2201` (parent=019dfd93-f943-7747-b8a5-489b04db75c3) — "Which expression has the lowest value?…"
  - `019e0954-cb84-7c01-a808-9199c27dc647` (parent=019dfd94-787f-7860-b744-ec2aa1f0fa45) — "Which expression has the lowest value?…"
  - `019e098f-83ca-7274-933c-0299aeca80a5` (parent=019dfda4-8a98-70ce-be1e-73e67ca8a6ab) — "Which expression has the lowest value?…"
- **Cluster #3** (size=4, sim p50=1.0000, max=1.0000)
  - `019e0973-f374-7eab-b540-7a7e14ac11cd` (parent=019dfd9d-20e1-78ee-9cf6-3b4bda2aaa1a) — "Which number has the highest value?…"
  - `019e0974-b1b0-7d70-81e4-8caca10e4d50` (parent=019dfd9d-511b-7401-acc4-d32344c2b177) — "Which number has the highest value?…"
  - `019e097b-c5fa-7d1d-ab99-41822d5cd50c` (parent=019dfd9f-4aa2-752c-ac6d-35ebb1570ff8) — "Which number has the highest value?…"
  - `019e0987-9415-7433-b342-c3de883e6060` (parent=019dfda2-7c7e-7f35-ade2-8f7dc0434008) — "Which number has the highest value?…"
- **Cluster #4** (size=3, sim p50=1.0000, max=1.0000)
  - `019e0974-667e-75eb-a323-2a4a089e3d45` (parent=019dfd9d-38e1-7f41-ab6d-b3fbeacd669b) — "Which expression has the highest value?…"
  - `019e097f-5943-7823-87f6-42c667d94820` (parent=019dfda0-0bf4-765f-a678-a9fa1203d308) — "Which expression has the highest value?…"
  - `019e0988-02eb-7fb7-8783-edfedadb559c` (parent=019dfda2-9ddc-7a62-b245-bf23f14548df) — "Which expression has the highest value?…"

### numerical.lowest_values | medium

- n = 40
- 0.92: clusters≥2=4, largest=28, in-clusters=40
- 0.95: clusters≥2=4, largest=28, in-clusters=39
- 0.97: clusters≥2=4, largest=28, in-clusters=39

> **TEMPLATING ARTIFACT** — body intrinsically templated; high cosine expected (pairwise p50 = 1.0000 per c4d8541 audit)

Clusters at threshold 0.95 (size ≥ 2):
- **Cluster #1** (size=28, sim p50=1.0000, max=1.0000)
  - `019e0951-55c5-7155-8bf5-acc92a37956a` (parent=019dfd93-6750-7586-b972-050b100c2aec) — "Which number has the lowest value?…"
  - `019e0951-969c-7f17-9909-da9ddfb8de74` (parent=019dfd93-7db3-7967-8c78-5a0f489f1e35) — "Which number has the lowest value?…"
  - `019e0951-e191-7739-b182-4540b43fb575` (parent=019dfd93-961e-7f78-b1fc-2cd42597b573) — "Which number has the lowest value?…"
  - `019e0952-2abe-7834-b503-f4c0908f3d15` (parent=019dfd93-ad70-79dd-850c-69e1cdefc4aa) — "Which number has the lowest value?…"
  - `019e0952-7b0a-73c8-b11c-84ae0bfe8f96` (parent=019dfd93-c94e-70d8-ad3d-88fd0f84558a) — "Which number has the lowest value?…"
  - `019e0952-bc5b-75ba-a739-f72c2995e94d` (parent=019dfd93-e086-7c0e-90ed-b8b1019de346) — "Which number has the lowest value?…"
  - `019e0953-6b3e-7022-8da6-75c87f5799a6` (parent=019dfd94-13b3-7e92-b50c-63b0a731c6a6) — "Which number has the lowest value?…"
  - `019e0953-c9d1-72e9-8895-0b09a79c8ebd` (parent=019dfd94-2bb3-7209-ad71-b98a2776fb62) — "Which number has the lowest value?…"
  - `019e0954-1599-7786-a71b-1cd068afb6e0` (parent=019dfd94-43b1-7ead-9563-607e533c9594) — "Which number has the lowest value?…"
  - `019e0954-74a0-7ed1-b0fe-92158227109c` (parent=019dfd94-5e1a-7eef-be4a-34f3bef1f246) — "Which number has the lowest value?…"
  - `019e0958-bf5d-710f-8c5a-3a4691292a89` (parent=019dfd95-c017-7999-aec5-8bcff819c2d7) — "Which number has the lowest value?…"
  - `019e095c-e4ad-7f82-9fe3-ad1030c6d00c` (parent=019dfd96-daf6-78fd-adb3-6239ae72d485) — "Which number has the lowest value?…"
  - `019e0962-fc4b-7d48-9fda-4f761dbcb21a` (parent=019dfd98-8db3-7661-a945-70c0b89b8758) — "Which number has the lowest value?…"
  - `019e0963-474b-7962-b058-937fa4d33b7c` (parent=019dfd98-a6e3-7950-b780-49034a8a8c31) — "Which number has the lowest value?…"
  - `019e0964-0fe7-70c7-b54d-95e29bdf4d01` (parent=019dfd98-dbb0-73f7-a401-9d00f9af88fa) — "Which number has the lowest value?…"
  - `019e0964-67e6-7ee0-b3a0-eab84d1e8ebd` (parent=019dfd98-f3b2-7c0e-bf9c-b3fd84608c2e) — "Which number has the lowest value?…"
  - `019e0964-b15b-79b3-b46f-d360ac180ef1` (parent=019dfd99-0d4b-7ed2-8758-5a687bf63c90) — "Which number has the lowest value?…"
  - `019e0985-650c-79f4-9171-7593947dc22a` (parent=019dfda1-d5ae-73fc-9e76-6b03db8bdae6) — "Which number has the lowest value?…"
  - `019e098b-788a-7429-8343-39368a07ad3d` (parent=019dfda3-77e3-7934-aa5d-0cf8f7ba131d) — "Which number has the lowest value?…"
  - `019e098b-d5bd-79fa-b549-5dbf7cdc12e5` (parent=019dfda3-a1f0-79ec-96c4-f903d32009e1) — "Which number has the lowest value?…"
  - `019e098e-d42b-79a0-ac65-a27cef5425f6` (parent=019dfda4-5705-77d2-9af6-867d339f440e) — "Which number has the lowest value?…"
  - `019e098f-2381-721a-90a1-75f2e5a11d8b` (parent=019dfda4-7214-7b36-a256-c3b8b8c2969b) — "Which number has the lowest value?…"
  - `019e099b-0836-74fc-93fe-4a1747dfad6e` (parent=019dfda7-5d2f-7de8-a42c-84bb115eeae0) — "Which number has the lowest value?…"
  - `019e09a2-a3d3-7fd2-8627-0c93872d31d0` (parent=019dfda9-385d-7199-82bd-48cdd6fc99c8) — "Which number has the lowest value?…"
  - `019e09ac-d276-7ef7-9ad2-78604d989dbb` (parent=019dfdab-d98f-7413-ace1-3796533bb6b6) — "Which number has the lowest value?…"
  - `019e09ad-35c8-7baf-ab19-a811b5c702f5` (parent=019dfdab-f8c3-78ea-99fe-460dea4114db) — "Which number has the lowest value?…"
  - `019e09ad-932a-733b-9e7f-b90ee87c3150` (parent=019dfdac-192d-7a4b-b9bf-2b56f30831f7) — "Which number has the lowest value?…"
  - `019e09d7-6436-7f84-8240-083f31912115` (parent=019dfda6-924d-7cf2-aa20-7aae1635aa7f) — "Which number has the lowest value?…"
- **Cluster #2** (size=3, sim p50=1.0000, max=1.0000)
  - `019e0953-1a37-73b5-aee3-cc5674e085d8` (parent=019dfd93-f943-7747-b8a5-489b04db75c3) — "Which expression has the lowest value?…"
  - `019e0954-cb84-7b97-a8e3-81f04290a08a` (parent=019dfd94-787f-7860-b744-ec2aa1f0fa45) — "Which expression has the lowest value?…"
  - `019e098f-83ca-7186-8e23-97f3c6382f97` (parent=019dfda4-8a98-70ce-be1e-73e67ca8a6ab) — "Which expression has the lowest value?…"
- **Cluster #3** (size=5, sim p50=1.0000, max=1.0000)
  - `019e0959-d1c2-7490-878d-25ae30f4a275` (parent=019dfd96-0db5-722c-8f3a-f62b449fc4bb) — "Which number has the highest value?…"
  - `019e0973-f374-7df9-b723-e7915b14d2eb` (parent=019dfd9d-20e1-78ee-9cf6-3b4bda2aaa1a) — "Which number has the highest value?…"
  - `019e0974-b1b0-7c9c-a49e-f1de5ec40b35` (parent=019dfd9d-511b-7401-acc4-d32344c2b177) — "Which number has the highest value?…"
  - `019e097b-c5fa-7c53-ab73-8eb8f110ecad` (parent=019dfd9f-4aa2-752c-ac6d-35ebb1570ff8) — "Which number has the highest value?…"
  - `019e0987-9415-73c0-a0dc-609d453e951e` (parent=019dfda2-7c7e-7f35-ade2-8f7dc0434008) — "Which number has the highest value?…"
- **Cluster #4** (size=3, sim p50=1.0000, max=1.0000)
  - `019e0974-667e-7489-aaa2-04444b1a2977` (parent=019dfd9d-38e1-7f41-ab6d-b3fbeacd669b) — "Which expression has the highest value?…"
  - `019e097f-5943-7774-8815-f1d732a68031` (parent=019dfda0-0bf4-765f-a678-a9fa1203d308) — "Which expression has the highest value?…"
  - `019e0988-02eb-7df3-a1c6-d4d80f20758b` (parent=019dfda2-9ddc-7a62-b245-bf23f14548df) — "Which expression has the highest value?…"

### numerical.number_series | brutal

- n = 49
- 0.92: clusters≥2=4, largest=2, in-clusters=8
- 0.95: clusters≥2=1, largest=2, in-clusters=2
- 0.97: clusters≥2=1, largest=2, in-clusters=2

Clusters at threshold 0.95 (size ≥ 2):
- **Cluster #1** (size=2, sim p50=0.9709, max=0.9709)
  - `019e0955-4fd5-781d-be52-c43304cbe154` (parent=019dfd94-a74d-75e2-8fe1-bd0134286f74) — "What is the next number in the series? 4 6 11 21 41…"
  - `019e0972-2f4e-73ac-8e28-d982e1feac42` (parent=019dfd9c-a34a-787e-9cb6-b30d22b6b200) — "What is the next number in the series? 4 6 11 21 41 81…"

### numerical.number_series | easy

- n = 49
- 0.92: clusters≥2=4, largest=3, in-clusters=10
- 0.95: clusters≥2=4, largest=3, in-clusters=9
- 0.97: clusters≥2=2, largest=2, in-clusters=4

Clusters at threshold 0.95 (size ≥ 2):
- **Cluster #1** (size=3, sim p50=0.9600, max=1.0000)
  - `019e0956-2b41-74eb-85e2-c76d7c31a976` (parent=019dfd94-ee18-7c5b-9578-56cfcf78cc40) — "What is the next number in the series? 2 5 10 17 26…"
  - `019e0956-71e5-72c1-aa89-8c8269ee90d7` (parent=019dfd95-027f-72c0-8652-1213da227e79) — "What is the next number in the series? 2 5 10 17 26…"
  - `019e0968-dd58-72ac-af08-ee8d5665a64a` (parent=019dfd9a-2b25-707d-add7-955de92ef0d5) — "What is the next number in the series? 2 5 10 17…"
- **Cluster #2** (size=2, sim p50=0.9617, max=0.9617)
  - `019e0958-0603-76f0-acfa-906d27feb85b` (parent=019dfd95-8e1a-7d6c-a687-342cea86545b) — "What is the next number in the series? 48 24 28 14 18 9…"
  - `019e0981-dac3-72e7-987c-959801975548` (parent=019dfda0-b348-7d3f-bfd6-74f584648c3f) — "What is the next number in the series? 48 24 20 10 6 3…"
- **Cluster #3** (size=2, sim p50=0.9698, max=0.9698)
  - `019e0969-aa64-764c-807e-28652e70d04d` (parent=019dfd9a-596f-7f40-8085-9364361634d6) — "What is the next number in the series? 2 3 5 8…"
  - `019e0977-f417-7771-b7ee-bd49dafe0f63` (parent=019dfd9e-254a-76a8-964c-883f90fe69cc) — "What is the next number in the series? 1 2 3 5 8…"
- **Cluster #4** (size=2, sim p50=1.0000, max=1.0000)
  - `019e096c-76b6-72da-bb8e-34c19435a064` (parent=019dfd9b-0e7f-7590-8f6f-c0231c84fec2) — "What is the next number in the series? 2 3 5 7 11…"
  - `019e0978-e098-729f-bd6e-153bce13f9e6` (parent=019dfd9e-57b0-7228-9228-107ce9d1c1e5) — "What is the next number in the series? 2 3 5 7 11…"

### numerical.number_series | hard

- n = 49
- 0.92: clusters≥2=1, largest=2, in-clusters=2
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.number_series | medium

- n = 49
- 0.92: clusters≥2=4, largest=2, in-clusters=8
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.percentages | brutal

- n = 33
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.percentages | easy

- n = 33
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.percentages | hard

- n = 33
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.percentages | medium

- n = 33
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.ratios | brutal

- n = 16
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.ratios | easy

- n = 16
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.ratios | hard

- n = 16
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.ratios | medium

- n = 16
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.speed_distance_time | brutal

- n = 17
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.speed_distance_time | easy

- n = 17
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.speed_distance_time | hard

- n = 17
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.speed_distance_time | medium

- n = 17
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.word_problems | brutal

- n = 29
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.word_problems | easy

- n = 29
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.word_problems | hard

- n = 29
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.word_problems | medium

- n = 29
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.workrate | brutal

- n = 15
- 0.92: clusters≥2=1, largest=2, in-clusters=2
- 0.95: clusters≥2=1, largest=2, in-clusters=2
- 0.97: clusters≥2=1, largest=2, in-clusters=2

Clusters at threshold 0.95 (size ≥ 2):
- **Cluster #1** (size=2, sim p50=0.9717, max=0.9717)
  - `019e098d-207d-7cad-af33-c52ebd0bb399` (parent=019dfda3-d728-7617-a8af-3768547c8c34) — "Pipe A fills a storage tank in 8 hours; pipe B fills the sam…"
  - `019e09f5-8292-7fcc-993d-611c953eb8e0` (parent=019dfdb5-3130-7228-859d-ae9217b39b00) — "Pipe A can fill a storage tank in 9 hours. Pipe B can fill t…"

### numerical.workrate | easy

- n = 15
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.workrate | hard

- n = 15
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### numerical.workrate | medium

- n = 15
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### verbal.analogies | brutal

- n = 43
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### verbal.analogies | easy

- n = 43
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### verbal.analogies | hard

- n = 43
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### verbal.analogies | medium

- n = 43
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### verbal.antonyms | brutal

- n = 35
- 0.92: clusters≥2=4, largest=13, in-clusters=19
- 0.95: clusters≥2=4, largest=13, in-clusters=19
- 0.97: clusters≥2=3, largest=12, in-clusters=16

Clusters at threshold 0.95 (size ≥ 2):
- **Cluster #1** (size=2, sim p50=1.0000, max=1.0000)
  - `019e0926-fff8-7206-b21e-21ae13da9fae` (parent=019dfbc8-1dd2-7731-9d17-4357bdf288c4) — "Choose the word that is most nearly the OPPOSITE of SANGUINE…"
  - `019e096d-5623-739f-9bc7-695078d57fb2` (parent=019dfd9b-5417-70e6-8f22-ba05d6ca1802) — "Choose the word that is most nearly the OPPOSITE of SANGUINE…"
- **Cluster #2** (size=2, sim p50=0.9641, max=0.9641)
  - `019e0967-01f0-709a-87a9-06fd0dfb351c` (parent=019dfd99-c5b0-7270-8185-1d29880f069b) — "Which of the following is most nearly the OPPOSITE of the wo…"
  - `019e0994-4e95-7758-8605-d58958ebd277` (parent=019dfda5-b551-714b-a13e-7f8d506a2e14) — "Which of the following is the opposite of the word "Turbid"?…"
- **Cluster #3** (size=13, sim p50=0.9865, max=1.0000)
  - `019e0967-62a7-73c3-8126-4fabe217a8c1` (parent=019dfd99-dc43-78cd-86f1-209ff185c882) — "Which of the following is the opposite of the word "sanguine…"
  - `019e096c-bff3-7daa-acbd-b7dc7b848097` (parent=019dfd9b-22e3-7b91-bc21-e46b04fc5dba) — "Which of the following is the opposite of the word "sanguine…"
  - `019e0976-2074-7518-b093-b2c2986f9049` (parent=019dfd9d-ace2-7b6e-a1bd-6a58d8f35f2c) — "Which of the following is the opposite of the word "sanguine…"
  - `019e097a-fc75-74d4-b4db-3d90cc205ee7` (parent=019dfd9f-1415-72f2-a06a-96f58ffd36a4) — "Which of the following is the opposite of the word "sanguine…"
  - `019e097d-9879-710b-b271-a088f04fe0a9` (parent=019dfd9f-c0f3-72c4-84d8-f6007aaa20a5) — "Which of the following is the opposite of the word "sanguine…"
  - `019e0982-e0dc-73ce-8ee6-a847ba6a566f` (parent=019dfda1-09af-78f5-87a7-219ba5629b57) — "Which of the following is the opposite of the word "sanguine…"
  - `019e0984-1541-7cfd-9149-4b6a43129bb7` (parent=019dfda1-6a15-7eb4-a01b-834e491e0ee0) — "Which of the following is the opposite of the word "sanguine…"
  - `019e0993-60fa-7982-8b6c-30141e5ebc86` (parent=019dfda5-6c1e-71b4-9797-5d2bc09eb53a) — "Which of the following is the opposite of the word "Sanguine…"
  - `019e099d-45d1-73dd-87cb-c6412db6bf37` (parent=019dfda7-f66b-73eb-ade2-7e1951460462) — "Which of the following is the opposite of the word "sanguine…"
  - `019e09af-7d10-7037-88a1-eeffae43aac0` (parent=019dfdac-9f96-7ef8-b9d7-800523d267d7) — "Which of the following is the opposite of the word Sanguine?…"
  - `019e09af-c1b4-73a4-875c-7ea9299ef7d4` (parent=019dfdac-b934-72ea-a786-436d334f4057) — "Which of the following is most nearly the OPPOSITE of the wo…"
  - `019e09b0-13bd-7796-9220-8c1f88369edd` (parent=019dfdac-d332-7cca-8d6a-eb422607ffbb) — "Which of the following is the opposite of the word Sanguine?…"
  - `019e09b0-60a5-7c1f-9d91-608186b2d708` (parent=019dfdac-f269-7144-a143-96f66914e366) — "Which of the following is the opposite of the word Sanguine?…"
- **Cluster #4** (size=2, sim p50=1.0000, max=1.0000)
  - `019e0975-dada-7624-ba1c-c329a6dcd0ca` (parent=019dfd9d-9656-73fc-a767-b9df99e0ef4e) — "Which of the following is the opposite of the word "officiou…"
  - `019e099d-a9b6-7bc4-89b8-43fae750368e` (parent=019dfda8-11f9-7d85-a19d-9129fa8102d6) — "Which of the following is the opposite of the word "officiou…"

### verbal.antonyms | easy

- n = 35
- 0.92: clusters≥2=6, largest=4, in-clusters=15
- 0.95: clusters≥2=6, largest=4, in-clusters=14
- 0.97: clusters≥2=6, largest=3, in-clusters=13

Clusters at threshold 0.95 (size ≥ 2):
- **Cluster #1** (size=2, sim p50=1.0000, max=1.0000)
  - `019e0967-01ef-7d54-be33-5149f017d096` (parent=019dfd99-c5b0-7270-8185-1d29880f069b) — "Which of the following is the opposite of the word "expand"?…"
  - `019e097d-9878-7bef-b0e7-3dd40850aa0a` (parent=019dfd9f-c0f3-72c4-84d8-f6007aaa20a5) — "Which of the following is the opposite of the word "expand"?…"
- **Cluster #2** (size=2, sim p50=1.0000, max=1.0000)
  - `019e096d-1162-754e-bc49-7af15e8c99f3` (parent=019dfd9b-3bb3-7765-9b26-122943142f23) — "Which of the following is the opposite of the word "shrink"?…"
  - `019e097a-fc75-71df-b7bc-d92607295632` (parent=019dfd9f-1415-72f2-a06a-96f58ffd36a4) — "Which of the following is the opposite of the word "shrink"?…"
- **Cluster #3** (size=4, sim p50=1.0000, max=1.0000)
  - `019e096d-5622-7ef3-af1d-579c0977c0b6` (parent=019dfd9b-5417-70e6-8f22-ba05d6ca1802) — "Which of the following is the opposite of the word "timid"?…"
  - `019e0994-a632-726c-aa11-9e0ec5d366cf` (parent=019dfda5-cd4e-7829-b741-299c454c1481) — "Which of the following is the opposite of the word "timid"?…"
  - `019e099c-fe76-7611-843c-f1b2fe63c405` (parent=019dfda7-e005-7c51-8a83-364d1a93a87d) — "Which of the following is the opposite of the word "timid"?…"
  - `019e09b0-13bd-716b-8417-6dfd3ef3afcb` (parent=019dfdac-d332-7cca-8d6a-eb422607ffbb) — "Which of the following is the opposite of the word Timid?…"
- **Cluster #4** (size=2, sim p50=0.9836, max=0.9836)
  - `019e0976-2074-7274-a2f7-7607f34f5913` (parent=019dfd9d-ace2-7b6e-a1bd-6a58d8f35f2c) — "Which of the following is the opposite of the word "generous…"
  - `019e0994-4e95-7435-b2ed-a0ac989f2b06` (parent=019dfda5-b551-714b-a13e-7f8d506a2e14) — "Which of the following is the opposite of the word "Generous…"
- **Cluster #5** (size=2, sim p50=1.0000, max=1.0000)
  - `019e0993-b4fd-7680-9982-f705b393a5f1` (parent=019dfda5-8685-7047-8890-dc9b72418650) — "Which of the following is the opposite of the word "Swift"?…"
  - `019e09af-c1b3-7e4f-af4e-6b019d755ede` (parent=019dfdac-b934-72ea-a786-436d334f4057) — "Which of the following is the opposite of the word "Swift"?…"
- **Cluster #6** (size=2, sim p50=1.0000, max=1.0000)
  - `019e09b0-60a5-761e-9a38-2fca226eaa8e` (parent=019dfdac-f269-7144-a143-96f66914e366) — "Which of the following is the opposite of the word Scatter?…"
  - `019e09b0-abb4-7f97-bc93-d3a5b2cf28fe` (parent=019dfdad-0c69-7ab5-8b9a-9dd2731fb32c) — "Which of the following is the opposite of the word Scatter?…"

### verbal.antonyms | hard

- n = 35
- 0.92: clusters≥2=3, largest=5, in-clusters=10
- 0.95: clusters≥2=3, largest=5, in-clusters=10
- 0.97: clusters≥2=3, largest=5, in-clusters=10

Clusters at threshold 0.95 (size ≥ 2):
- **Cluster #1** (size=2, sim p50=1.0000, max=1.0000)
  - `019e0928-201c-7648-96e7-707290606b7a` (parent=019dfbc8-1dd8-70de-bc6e-bae7218a7202) — "Choose the word that is most nearly the OPPOSITE of TACITURN…"
  - `019e0928-bc1a-7e9a-8762-c77c2b881a82` (parent=019dfbc8-1dda-7983-9c28-b42493b2b2f6) — "Choose the word that is most nearly the OPPOSITE of TACITURN…"
- **Cluster #2** (size=3, sim p50=0.9772, max=1.0000)
  - `019e0967-62a7-7234-977f-1df0b420d22d` (parent=019dfd99-dc43-78cd-86f1-209ff185c882) — "Which of the following is the opposite of the word "taciturn…"
  - `019e096d-5623-72ec-bfe9-17f6f473b5d0` (parent=019dfd9b-5417-70e6-8f22-ba05d6ca1802) — "Which of the following is the opposite of the word "taciturn…"
  - `019e09af-c1b4-72ed-b6e2-1128be481841` (parent=019dfdac-b934-72ea-a786-436d334f4057) — "Which of the following is the opposite of the word "Taciturn…"
- **Cluster #3** (size=5, sim p50=0.9865, max=1.0000)
  - `019e0993-b4ff-7928-ae5a-af8e466e2310` (parent=019dfda5-8685-7047-8890-dc9b72418650) — "Which of the following is the opposite of the word "Sanguine…"
  - `019e0994-4e95-76e6-8621-70a8f5ab3591` (parent=019dfda5-b551-714b-a13e-7f8d506a2e14) — "Which of the following is the opposite of the word "Sanguine…"
  - `019e0994-a632-7897-8139-2904a05b9123` (parent=019dfda5-cd4e-7829-b741-299c454c1481) — "Which of the following is the opposite of the word "sanguine…"
  - `019e099d-a9b6-7b1c-b25d-1a72bb1c0391` (parent=019dfda8-11f9-7d85-a19d-9129fa8102d6) — "Which of the following is the opposite of the word "sanguine…"
  - `019e099e-516e-790f-a21f-abc3e6f4333f` (parent=019dfda8-46c9-7877-8b5b-c5f3c6d6d358) — "Which of the following is the opposite of the word "sanguine…"

### verbal.antonyms | medium

- n = 35
- 0.92: clusters≥2=3, largest=6, in-clusters=10
- 0.95: clusters≥2=3, largest=6, in-clusters=10
- 0.97: clusters≥2=3, largest=6, in-clusters=10

Clusters at threshold 0.95 (size ≥ 2):
- **Cluster #1** (size=6, sim p50=0.9876, max=1.0000)
  - `019e0967-62a7-7148-84c9-80221ea9635c` (parent=019dfd99-dc43-78cd-86f1-209ff185c882) — "Which of the following is the opposite of the word "frugal"?…"
  - `019e096d-5623-71ce-b1e2-2ed46fa6377d` (parent=019dfd9b-5417-70e6-8f22-ba05d6ca1802) — "Which of the following is the opposite of the word "frugal"?…"
  - `019e0976-2074-7456-a1d8-51b6eee0e2a0` (parent=019dfd9d-ace2-7b6e-a1bd-6a58d8f35f2c) — "Which of the following is the opposite of the word "frugal"?…"
  - `019e099e-516e-77fb-87b9-6849dbcba841` (parent=019dfda8-46c9-7877-8b5b-c5f3c6d6d358) — "Which of the following is the opposite of the word "frugal"?…"
  - `019e09af-c1b4-7203-acd8-a18e4d71ef7d` (parent=019dfdac-b934-72ea-a786-436d334f4057) — "Which of the following is the opposite of the word "Frugal"?…"
  - `019e09b0-13bd-756a-8a4e-35d937af02bf` (parent=019dfdac-d332-7cca-8d6a-eb422607ffbb) — "Which of the following is the opposite of the word Frugal?…"
- **Cluster #2** (size=2, sim p50=1.0000, max=1.0000)
  - `019e096d-1162-78bf-ab76-086275f802b0` (parent=019dfd9b-3bb3-7765-9b26-122943142f23) — "Which of the following is the opposite of the word "squander…"
  - `019e096d-a549-78da-937b-4bf90b823699` (parent=019dfd9b-6ee3-7b62-84b9-ce8d1ea89491) — "Which of the following is the opposite of the word "squander…"
- **Cluster #3** (size=2, sim p50=1.0000, max=1.0000)
  - `019e0994-a632-779b-a182-00f08fe7e2b8` (parent=019dfda5-cd4e-7829-b741-299c454c1481) — "Which of the following is the opposite of the word "reticent…"
  - `019e099d-a9b6-7a42-8fe1-51cd121075a2` (parent=019dfda8-11f9-7d85-a19d-9129fa8102d6) — "Which of the following is the opposite of the word "reticent…"

### verbal.critical_reasoning | brutal

- n = 58
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### verbal.critical_reasoning | easy

- n = 58
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### verbal.critical_reasoning | hard

- n = 58
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### verbal.critical_reasoning | medium

- n = 58
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### verbal.letter_series | brutal

- n = 16
- 0.92: clusters≥2=1, largest=2, in-clusters=2
- 0.95: clusters≥2=1, largest=2, in-clusters=2
- 0.97: clusters≥2=1, largest=2, in-clusters=2

> **PARTIAL TEMPLATING** — body shape varies; some legitimate near-matches expected

Clusters at threshold 0.95 (size ≥ 2):
- **Cluster #1** (size=2, sim p50=0.9785, max=0.9785)
  - `019e0989-22a1-7ad0-91fd-29cc864a66df` (parent=019dfda2-e4a6-7e79-961d-47cf7a0dc1f9) — "Which pair of letters comes next in the series below? AZ, CV…"
  - `019e099a-968c-7e03-a317-f9a24828eb45` (parent=019dfda7-452f-7540-8f3d-63a92142c4b8) — "Which pair of letters comes next in the series below? AZ…CV……"

### verbal.letter_series | easy

- n = 16
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

> **PARTIAL TEMPLATING** — body shape varies; some legitimate near-matches expected

### verbal.letter_series | hard

- n = 16
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

> **PARTIAL TEMPLATING** — body shape varies; some legitimate near-matches expected

### verbal.letter_series | medium

- n = 16
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

> **PARTIAL TEMPLATING** — body shape varies; some legitimate near-matches expected

### verbal.sentence_completion | brutal

- n = 59
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### verbal.sentence_completion | easy

- n = 59
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### verbal.sentence_completion | hard

- n = 59
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

### verbal.sentence_completion | medium

- n = 59
- 0.92: clusters≥2=0, largest=1, in-clusters=0
- 0.95: clusters≥2=0, largest=1, in-clusters=0
- 0.97: clusters≥2=0, largest=1, in-clusters=0

## Methodology notes

- **Cosine threshold rationale**: 0.92 is parent §4.13 forward-pin for sub-phase b validator; 0.95 represents stronger near-clone detection; 0.97 represents byte-near clones.
- **Clustering**: connected-components. Items A-B at sim ≥ threshold form an edge; transitive closure produces the cluster. A cluster member doesn't need to be ≥ threshold against ALL members, just along one path.
- **Scope**: source='generated' only. source='real' items are exempt per parent §4.13's exemption rules and aren't candidates for cleanup in any case.
- **Edge-set**: pgvector `1 - (a.embedding <=> b.embedding)` ≥ 0.92, scoped to same (sub_type_id, difficulty). One self-join across the whole bank.

## SANGUINE deep-dive

- Total SANGUINE-bearing antonyms-brutal candidates: **16**
- Pairwise cosine within the cluster: n=120 pairs; min=0.7419, p25=0.7814, p50=0.9773, p75=1.0000, max=1.0000
- Distinct option-set fingerprints (sha256 hash of sorted options.text): **15** out of 16
  - Interpretation: option-set overlap detected; diversified-distractors with same target word

**Per-candidate verbatim:**

- `019e0926-fff8-7206-b21e-21ae13da9fae` (parent=`019dfbc8-1dd2-7731-9d17-4357bdf288c4`)
  - body: "Choose the word that is most nearly the OPPOSITE of SANGUINE."
  - options: despondent || pale || bloodthirsty || timid || composed
  - explanation[0..200]: "In its dominant modern sense, SANGUINE means optimistic and cheerfully confident; 'despondent' (deeply hopeless and dispirited) is its clearest opposite. 'Pale' exploits SANGUINE's secondary/historica…"
- `019e0967-62a7-73c3-8126-4fabe217a8c1` (parent=`019dfd99-dc43-78cd-86f1-209ff185c882`)
  - body: "Which of the following is the opposite of the word "sanguine"?"
  - options: despondent || pallid || phlegmatic || timorous || choleric
  - explanation[0..200]: "'Sanguine' in its dominant modern sense means optimistic and positive, especially in a difficult situation. Its clearest opposite is a word meaning deeply hopeless or dispirited. 'Sanguine' carries a …"
- `019e096c-bff3-7daa-acbd-b7dc7b848097` (parent=`019dfd9b-22e3-7b91-bc21-e46b04fc5dba`)
  - body: "Which of the following is the opposite of the word "sanguine"?"
  - options: despondent || pallid || choleric || timid || lethargic
  - explanation[0..200]: ""Sanguine" has two senses: (1) the dominant modern sense — optimistic and positive, especially in difficult circumstances; (2) a historical/humoral sense — blood-red in color, relating to the sanguine…"
- `019e096d-1162-7b19-948f-c25af047b893` (parent=`019dfd9b-3bb3-7765-9b26-122943142f23`)
  - body: "Which of the following is most nearly the OPPOSITE of SANGUINE?"
  - options: pallid || despondent || ardent || choleric || timorous
  - explanation[0..200]: "'Sanguine' carries a dominant modern sense of optimistic and cheerfully confident, as well as a secondary humoral/historical sense referring to a ruddy, blood-flushed complexion or the sanguine temper…"
- `019e096d-5623-739f-9bc7-695078d57fb2` (parent=`019dfd9b-5417-70e6-8f22-ba05d6ca1802`)
  - body: "Choose the word that is most nearly the OPPOSITE of SANGUINE."
  - options: despondent || pallid || irascible || serene || languid
  - explanation[0..200]: "'Sanguine' in its dominant modern sense means confidently optimistic and cheerful; its true opposite is a word that captures hopeless dejection — 'despondent' fits precisely. 'Pallid' is the antonym o…"
- `019e0976-2074-7518-b093-b2c2986f9049` (parent=`019dfd9d-ace2-7b6e-a1bd-6a58d8f35f2c`)
  - body: "Which of the following is the opposite of the word "sanguine"?"
  - options: despondent || pallid || irascible || serene || lethargic
  - explanation[0..200]: "In its dominant modern sense, 'sanguine' means optimistic or cheerfully confident; the clearest opposite is 'despondent,' meaning in low spirits or without hope. 'Sanguine' also carries a historical/h…"
- `019e097a-fc75-74d4-b4db-3d90cc205ee7` (parent=`019dfd9f-1415-72f2-a06a-96f58ffd36a4`)
  - body: "Which of the following is the opposite of the word "sanguine"?"
  - options: despondent || pallid || irascible || serene || bloodless
  - explanation[0..200]: "In its dominant modern sense, 'sanguine' means optimistic or cheerfully confident about the future; its direct opposite is to be in low spirits or without hope. 'pallid' and 'bloodless' target 'sangui…"
- `019e097d-9879-710b-b271-a088f04fe0a9` (parent=`019dfd9f-c0f3-72c4-84d8-f6007aaa20a5`)
  - body: "Which of the following is the opposite of the word "sanguine"?"
  - options: despondent || pallid || choleric || timid || lethargic
  - explanation[0..200]: ""Sanguine" in its dominant modern sense means optimistic and positive, especially in a difficult situation. Its true antonym is a word meaning deeply pessimistic or hopeless. "Pallid" exploits the sec…"
- `019e0982-e0dc-73ce-8ee6-a847ba6a566f` (parent=`019dfda1-09af-78f5-87a7-219ba5629b57`)
  - body: "Which of the following is the opposite of the word "sanguine"?"
  - options: pallid || despondent || irascible || phlegmatic || ruddy
  - explanation[0..200]: "In its dominant modern sense, 'sanguine' means confidently optimistic and positive in outlook. Its direct opposite is profound hopelessness — 'despondent' (in low spirits from loss of hope or courage)…"
- `019e0984-1541-7cfd-9149-4b6a43129bb7` (parent=`019dfda1-6a15-7eb4-a01b-834e491e0ee0`)
  - body: "Which of the following is the opposite of the word "sanguine"?"
  - options: pallid || despondent || choleric || serene || irascible
  - explanation[0..200]: "The dominant modern sense of 'sanguine' is optimistic or cheerfully confident about outcomes. Its true opposite must mean gloomy or without hope. 'Pallid' opposes the secondary (humoral/etymological) …"
- `019e0993-60fa-7982-8b6c-30141e5ebc86` (parent=`019dfda5-6c1e-71b4-9797-5d2bc09eb53a`)
  - body: "Which of the following is the opposite of the word "Sanguine"?"
  - options: Despairing || Pallid || Phlegmatic || Cowardly || Hostile
  - explanation[0..200]: "In its dominant modern sense, 'Sanguine' means confidently optimistic and hopeful — its direct opposite is a state of hopelessness or despair. 'Pallid' is the most sophisticated trap: it exploits 'San…"
- `019e099d-45d1-73dd-87cb-c6412db6bf37` (parent=`019dfda7-f66b-73eb-ade2-7e1951460462`)
  - body: "Which of the following is the opposite of the word "sanguine"?"
  - options: Despondent || Pallid || Irascible || Phlegmatic || Morbid
  - explanation[0..200]: "'Sanguine' in its dominant modern sense means cheerfully optimistic and confident. The clearest antonym is a word meaning deeply hopeless or dispirited. 'Pallid' targets the secondary (humoral/physiol…"
- `019e09af-7d10-7037-88a1-eeffae43aac0` (parent=`019dfdac-9f96-7ef8-b9d7-800523d267d7`)
  - body: "Which of the following is the opposite of the word Sanguine?"
  - options: Despondent || Pallid || Phlegmatic || Irascible || Timid
  - explanation[0..200]: "In its dominant modern sense, 'sanguine' means optimistic and positive in outlook. Its clearest opposite is a state of hopelessness or dejection. The distractors exploit the word's secondary senses an…"
- `019e09af-c1b4-73a4-875c-7ea9299ef7d4` (parent=`019dfdac-b934-72ea-a786-436d334f4057`)
  - body: "Which of the following is most nearly the OPPOSITE of the word "Sanguine"?"
  - options: Despondent || Bloodless || Vivid || Serene || Ardent
  - explanation[0..200]: "'Sanguine' carries two senses: its dominant modern sense means optimistic and positive in outlook; its secondary (historical/medical-humoral) sense refers to a ruddy, blood-flushed complexion or the b…"
- `019e09b0-13bd-7796-9220-8c1f88369edd` (parent=`019dfdac-d332-7cca-8d6a-eb422607ffbb`)
  - body: "Which of the following is the opposite of the word Sanguine?"
  - options: Pallid || Pessimistic || Irascible || Phlegmatic || Mournful
  - explanation[0..200]: "In its dominant modern sense, 'sanguine' means optimistic and positive, especially in a difficult situation. The correct antonym must oppose this outlook of confident hopefulness. 'Pallid' exploits th…"
- `019e09b0-60a5-7c1f-9d91-608186b2d708` (parent=`019dfdac-f269-7144-a143-96f66914e366`)
  - body: "Which of the following is the opposite of the word Sanguine?"
  - options: Despondent || Pallid || Phlegmatic || Timorous || Irascible
  - explanation[0..200]: "Anchor on the dominant modern meaning of 'Sanguine' — optimistic and confident, especially in difficult situations. The clearest opposite is a word meaning hopeless or dejected in outlook. 'Pallid' ex…"

## Top 5 OTHER cells (non-antonyms-brutal) at threshold 0.95

### #1: numerical.lowest_values | brutal

- n=40; largest cluster=29; clusters ≥2=4; in-clusters=39
- Cluster #1 (size=29, sim p50=1.0000):
  - `019e0951-55c5-7210-b75d-76eb5578f8e3` — "Which number has the lowest value?…"
  - `019e0951-969d-70b8-8a1b-671efda3c9db` — "Which number has the lowest value?…"
  - `019e0951-e191-794c-9bf6-c4fd3d6d10e5` — "Which number has the lowest value?…"
  - `019e0952-2abe-790c-b38f-5432fd81201c` — "Which number has the lowest value?…"
  - `019e0952-7b0a-74c2-a266-315b6e2beffb` — "Which number has the lowest value?…"
  - `019e0952-bc5b-7729-a882-6f69b1458fa3` — "Which number has the lowest value?…"
  - `019e0953-6b3e-7180-a545-1d6696dc9567` — "Which number has the lowest value?…"
  - `019e0953-c9d1-7443-964f-d4fcc63cd204` — "Which number has the lowest value?…"
  - `019e0954-1599-7919-8461-658ed9383016` — "Which number has the lowest value?…"
  - `019e0954-74a1-708e-8659-1e7c6741d93e` — "Which number has the lowest value?…"
  - `019e0958-bf5d-7207-a527-305171311cb4` — "Which number has the lowest value?…"
  - `019e0959-d1c2-7564-ba43-b01ce8e9272f` — "Which number has the lowest value?…"
  - `019e095c-e4ae-7040-b05f-ed4b4baf066b` — "Which number has the lowest value?…"
  - `019e0962-fc4b-7f4d-961e-804e33d9bb01` — "Which number has the lowest value?…"
  - `019e0963-474b-7a25-976f-c46440b24b3b` — "Which number has the lowest value?…"
  - `019e0964-0fe7-73e7-a592-4c77a78ad6b2` — "Which number has the lowest value?…"
  - `019e0964-67e7-7057-941b-3ec39456ad85` — "Which number has the lowest value?…"
  - `019e0964-b15b-7afc-b8db-a3a498b7ccbf` — "Which number has the lowest value?…"
  - `019e0985-650c-7aef-8d3a-6e64494de46d` — "Which number has the lowest value?…"
  - `019e098b-788a-7667-a48a-8c4d7ca9fd3c` — "Which number has the lowest value?…"
  - `019e098b-d5bd-7aa7-93d6-8685d741a009` — "Which number has the lowest value?…"
  - `019e098e-d42b-7ab1-b158-343563fe2247` — "Which number has the lowest value?…"
  - `019e098f-2381-7396-898a-3e5b26e5ee26` — "Which number has the lowest value?…"
  - `019e099b-0836-7664-904a-eb9d49c24f61` — "Which number has the lowest value?…"
  - `019e09a2-a3d4-709b-a702-12be969876ae` — "Which number has the lowest value?…"
  - `019e09ac-d277-718c-946a-5511918be226` — "Which number has the lowest value?…"
  - `019e09ad-35c8-7c88-a72c-aa55b0bd3bdf` — "Which number has the lowest value?…"
  - `019e09ad-932a-748b-b0bd-f5372490cff4` — "Which number has the lowest value?…"
  - `019e09d7-6437-70d3-a034-eca712406866` — "Which number has the lowest value?…"
- Cluster #2 (size=3, sim p50=1.0000):
  - `019e0953-1a37-7555-a9e6-d3de66002d94` — "Which expression has the lowest value?…"
  - `019e0954-cb84-7ce5-8c87-af45fe882ac6` — "Which expression has the lowest value?…"
  - `019e098f-83ca-73c8-8f68-d9a553306f98` — "Which expression has the lowest value?…"
- Cluster #3 (size=4, sim p50=1.0000):
  - `019e0973-f375-7008-bb53-846aeae97a3c` — "Which number has the highest value?…"
  - `019e0974-b1b0-7e5e-9921-0f5c87a7fb21` — "Which number has the highest value?…"
  - `019e097b-c5fa-7e3f-9e73-ecb718ef9274` — "Which number has the highest value?…"
  - `019e0987-9415-74fc-a052-aa36b8942da9` — "Which number has the highest value?…"
- Cluster #4 (size=3, sim p50=1.0000):
  - `019e0974-667e-7646-ace9-f4a655496c8b` — "Which expression has the highest value?…"
  - `019e097f-5943-78a1-8ac6-f25175c3941f` — "Which expression has the highest value?…"
  - `019e0988-02ec-70ff-83d1-711bb570d2f8` — "Which expression has the highest value?…"
- characterization: **templating artifact**

### #2: numerical.lowest_values | hard

- n=40; largest cluster=29; clusters ≥2=4; in-clusters=39
- Cluster #1 (size=29, sim p50=1.0000):
  - `019e0951-55c5-71bf-9681-37b150cf8482` — "Which number has the lowest value?…"
  - `019e0951-969d-705f-853c-cecced4102a1` — "Which number has the lowest value?…"
  - `019e0951-e191-782f-88cc-4ec9bcb8ea59` — "Which number has the lowest value?…"
  - `019e0952-2abe-78b3-96d9-133f620259ae` — "Which number has the lowest value?…"
  - `019e0952-7b0a-7467-9222-ef89d82711f2` — "Which number has the lowest value?…"
  - `019e0952-bc5b-7680-a6b4-cab60268f063` — "Which number has the lowest value?…"
  - `019e0953-6b3e-7092-a039-89a4b6c6bf86` — "Which number has the lowest value?…"
  - `019e0953-c9d1-73a9-9b2a-6a41072e06f9` — "Which number has the lowest value?…"
  - `019e0954-1599-7867-99ff-c84618a54a23` — "Which number has the lowest value?…"
  - `019e0954-74a0-7fcc-9dc6-0c8b3fd078c7` — "Which number has the lowest value?…"
  - `019e0958-bf5d-718a-9c4a-cf0025ff91d1` — "Which number has the lowest value?…"
  - `019e0959-d1c2-751a-b989-3d8e72243f3d` — "Which number has the lowest value?…"
  - `019e095c-e4ad-7ff5-9b5e-d5a8b8902e10` — "Which number has the lowest value?…"
  - `019e0962-fc4b-7e7f-b688-ce4408c5386c` — "Which number has the lowest value?…"
  - `019e0963-474b-79d7-a652-103e13c1b31f` — "Which number has the lowest value?…"
  - `019e0964-0fe7-7279-88d0-e33e8e12b95b` — "Which number has the lowest value?…"
  - `019e0964-67e6-7f59-899e-61fccd7bc63d` — "Which number has the lowest value?…"
  - `019e0964-b15b-7a15-be24-a049fb2675e6` — "Which number has the lowest value?…"
  - `019e0985-650c-7a7e-97a1-7b948bae5d52` — "Which number has the lowest value?…"
  - `019e098b-788a-74fc-a73d-38a0e05d4884` — "Which number has the lowest value?…"
  - `019e098b-d5bd-7a5d-975e-40b18a36a5f1` — "Which number has the lowest value?…"
  - `019e098e-d42b-7a38-927c-682b7fb2e363` — "Which number has the lowest value?…"
  - `019e098f-2381-7283-b721-1981d4fbc1cd` — "Which number has the lowest value?…"
  - `019e099b-0836-7582-a196-db8d55bf6cd1` — "Which number has the lowest value?…"
  - `019e09a2-a3d4-704b-b4e3-3f9968427217` — "Which number has the lowest value?…"
  - `019e09ac-d277-7035-9ab7-29f0f692dbcd` — "Which number has the lowest value?…"
  - `019e09ad-35c8-7c39-a137-c2ae38064396` — "Which number has the lowest value?…"
  - `019e09ad-932a-7428-a22c-fb64b4c0d17a` — "Which number has the lowest value?…"
  - `019e09d7-6437-7074-8fd7-8e8a232d062a` — "Which number has the lowest value?…"
- Cluster #2 (size=3, sim p50=1.0000):
  - `019e0953-1a37-747f-84aa-edf2a6ed2201` — "Which expression has the lowest value?…"
  - `019e0954-cb84-7c01-a808-9199c27dc647` — "Which expression has the lowest value?…"
  - `019e098f-83ca-7274-933c-0299aeca80a5` — "Which expression has the lowest value?…"
- Cluster #3 (size=4, sim p50=1.0000):
  - `019e0973-f374-7eab-b540-7a7e14ac11cd` — "Which number has the highest value?…"
  - `019e0974-b1b0-7d70-81e4-8caca10e4d50` — "Which number has the highest value?…"
  - `019e097b-c5fa-7d1d-ab99-41822d5cd50c` — "Which number has the highest value?…"
  - `019e0987-9415-7433-b342-c3de883e6060` — "Which number has the highest value?…"
- Cluster #4 (size=3, sim p50=1.0000):
  - `019e0974-667e-75eb-a323-2a4a089e3d45` — "Which expression has the highest value?…"
  - `019e097f-5943-7823-87f6-42c667d94820` — "Which expression has the highest value?…"
  - `019e0988-02eb-7fb7-8783-edfedadb559c` — "Which expression has the highest value?…"
- characterization: **templating artifact**

### #3: numerical.lowest_values | easy

- n=40; largest cluster=28; clusters ≥2=4; in-clusters=39
- Cluster #1 (size=28, sim p50=1.0000):
  - `019e0951-55c4-7ef5-a7f7-0bd52fbcc934` — "Which number has the lowest value?…"
  - `019e0951-969c-7d0f-b1d6-c4dab9ffd108` — "Which number has the lowest value?…"
  - `019e0951-e191-7181-b0a6-1a108995aafb` — "Which number has the lowest value?…"
  - `019e0952-2abe-73f9-836a-5ca837a73552` — "Which number has the lowest value?…"
  - `019e0952-7b0a-70f4-8ce5-b940a26e3494` — "Which number has the lowest value?…"
  - `019e0952-bc5b-72a1-935e-434e4cc11473` — "Which number has the lowest value?…"
  - `019e0953-6b3d-7dda-9b7e-ccee310bd46c` — "Which number has the lowest value?…"
  - `019e0953-c9d1-7065-a7ac-3f7f63dba2b1` — "Which number has the lowest value?…"
  - `019e0954-1599-744c-baea-7094c07e2de2` — "Which number has the lowest value?…"
  - `019e0954-74a0-7951-ab07-6b1d5ba8b6c2` — "Which number has the lowest value?…"
  - `019e0958-bf5c-7e37-bcb4-f9c590bd07dc` — "Which number has the lowest value?…"
  - `019e095c-e4ad-7d81-aaa5-c7705d1a3604` — "Which number has the lowest value?…"
  - `019e0962-fc4b-77d7-9c5f-e6494cd00a94` — "Which number has the lowest value?…"
  - `019e0963-474b-76d6-bd50-3ac4f0f01cb7` — "Which number has the lowest value?…"
  - `019e0964-0fe6-7daa-b2bf-95ca4b4008ad` — "Which number has the lowest value?…"
  - `019e0964-67e6-7b06-a635-b8e4f4d1e1b1` — "Which number has the lowest value?…"
  - `019e0964-b15b-772b-bb34-a4c2bc323091` — "Which number has the lowest value?…"
  - `019e0985-650c-767e-9dea-e325c9b06984` — "Which number has the lowest value?…"
  - `019e098b-788a-70a9-abde-2ea5e14f75ac` — "Which number has the lowest value?…"
  - `019e098b-d5bd-7803-bf25-72d858c20a85` — "Which number has the lowest value?…"
  - `019e098e-d42b-7762-a9a5-027b7a37d9ff` — "Which number has the lowest value?…"
  - `019e098f-2380-7f3d-8229-dc63ac78c7fc` — "Which number has the lowest value?…"
  - `019e099b-0836-72a6-a00b-314b4b0b9e0a` — "Which number has the lowest value?…"
  - `019e09a2-a3d3-7ba8-91a0-1899f443bb5d` — "Which number has the lowest value?…"
  - `019e09ac-d276-7b9d-b658-b6a05456efba` — "Which number has the lowest value?…"
  - `019e09ad-35c8-792c-817d-8af38c55cd51` — "Which number has the lowest value?…"
  - `019e09ad-932a-7062-b9da-8123fac5ac63` — "Which number has the lowest value?…"
  - `019e09d7-6436-7b38-8f49-a63b121358ac` — "Which number has the lowest value?…"
- Cluster #2 (size=3, sim p50=1.0000):
  - `019e0953-1a37-7044-9c9d-f17bc36ea7bd` — "Which expression has the lowest value?…"
  - `019e0954-cb84-7988-9073-f7732fbfd16f` — "Which expression has the lowest value?…"
  - `019e098f-83c9-7c01-92fa-f08a59017e2f` — "Which expression has the lowest value?…"
- Cluster #3 (size=5, sim p50=1.0000):
  - `019e0959-d1c2-71ff-beeb-9b3e90faf5fa` — "Which number has the highest value?…"
  - `019e0973-f374-7954-8429-9280ace60a35` — "Which number has the highest value?…"
  - `019e0974-b1b0-7a20-bc5c-20630d0da2bb` — "Which number has the highest value?…"
  - `019e097b-c5fa-776c-b5d6-5fb846f36775` — "Which number has the highest value?…"
  - `019e0987-9415-716f-a644-99fa95efbf24` — "Which number has the highest value?…"
- Cluster #4 (size=3, sim p50=1.0000):
  - `019e0974-667e-7174-a98f-07bfba7773fd` — "Which expression has the highest value?…"
  - `019e097f-5943-7404-89ca-4095ed2f38de` — "Which expression has the highest value?…"
  - `019e0988-02eb-7a14-a6d1-468554df40a1` — "Which expression has the highest value?…"
- characterization: **templating artifact**

### #4: numerical.lowest_values | medium

- n=40; largest cluster=28; clusters ≥2=4; in-clusters=39
- Cluster #1 (size=28, sim p50=1.0000):
  - `019e0951-55c5-7155-8bf5-acc92a37956a` — "Which number has the lowest value?…"
  - `019e0951-969c-7f17-9909-da9ddfb8de74` — "Which number has the lowest value?…"
  - `019e0951-e191-7739-b182-4540b43fb575` — "Which number has the lowest value?…"
  - `019e0952-2abe-7834-b503-f4c0908f3d15` — "Which number has the lowest value?…"
  - `019e0952-7b0a-73c8-b11c-84ae0bfe8f96` — "Which number has the lowest value?…"
  - `019e0952-bc5b-75ba-a739-f72c2995e94d` — "Which number has the lowest value?…"
  - `019e0953-6b3e-7022-8da6-75c87f5799a6` — "Which number has the lowest value?…"
  - `019e0953-c9d1-72e9-8895-0b09a79c8ebd` — "Which number has the lowest value?…"
  - `019e0954-1599-7786-a71b-1cd068afb6e0` — "Which number has the lowest value?…"
  - `019e0954-74a0-7ed1-b0fe-92158227109c` — "Which number has the lowest value?…"
  - `019e0958-bf5d-710f-8c5a-3a4691292a89` — "Which number has the lowest value?…"
  - `019e095c-e4ad-7f82-9fe3-ad1030c6d00c` — "Which number has the lowest value?…"
  - `019e0962-fc4b-7d48-9fda-4f761dbcb21a` — "Which number has the lowest value?…"
  - `019e0963-474b-7962-b058-937fa4d33b7c` — "Which number has the lowest value?…"
  - `019e0964-0fe7-70c7-b54d-95e29bdf4d01` — "Which number has the lowest value?…"
  - `019e0964-67e6-7ee0-b3a0-eab84d1e8ebd` — "Which number has the lowest value?…"
  - `019e0964-b15b-79b3-b46f-d360ac180ef1` — "Which number has the lowest value?…"
  - `019e0985-650c-79f4-9171-7593947dc22a` — "Which number has the lowest value?…"
  - `019e098b-788a-7429-8343-39368a07ad3d` — "Which number has the lowest value?…"
  - `019e098b-d5bd-79fa-b549-5dbf7cdc12e5` — "Which number has the lowest value?…"
  - `019e098e-d42b-79a0-ac65-a27cef5425f6` — "Which number has the lowest value?…"
  - `019e098f-2381-721a-90a1-75f2e5a11d8b` — "Which number has the lowest value?…"
  - `019e099b-0836-74fc-93fe-4a1747dfad6e` — "Which number has the lowest value?…"
  - `019e09a2-a3d3-7fd2-8627-0c93872d31d0` — "Which number has the lowest value?…"
  - `019e09ac-d276-7ef7-9ad2-78604d989dbb` — "Which number has the lowest value?…"
  - `019e09ad-35c8-7baf-ab19-a811b5c702f5` — "Which number has the lowest value?…"
  - `019e09ad-932a-733b-9e7f-b90ee87c3150` — "Which number has the lowest value?…"
  - `019e09d7-6436-7f84-8240-083f31912115` — "Which number has the lowest value?…"
- Cluster #2 (size=3, sim p50=1.0000):
  - `019e0953-1a37-73b5-aee3-cc5674e085d8` — "Which expression has the lowest value?…"
  - `019e0954-cb84-7b97-a8e3-81f04290a08a` — "Which expression has the lowest value?…"
  - `019e098f-83ca-7186-8e23-97f3c6382f97` — "Which expression has the lowest value?…"
- Cluster #3 (size=5, sim p50=1.0000):
  - `019e0959-d1c2-7490-878d-25ae30f4a275` — "Which number has the highest value?…"
  - `019e0973-f374-7df9-b723-e7915b14d2eb` — "Which number has the highest value?…"
  - `019e0974-b1b0-7c9c-a49e-f1de5ec40b35` — "Which number has the highest value?…"
  - `019e097b-c5fa-7c53-ab73-8eb8f110ecad` — "Which number has the highest value?…"
  - `019e0987-9415-73c0-a0dc-609d453e951e` — "Which number has the highest value?…"
- Cluster #4 (size=3, sim p50=1.0000):
  - `019e0974-667e-7489-aaa2-04444b1a2977` — "Which expression has the highest value?…"
  - `019e097f-5943-7774-8815-f1d732a68031` — "Which expression has the highest value?…"
  - `019e0988-02eb-7df3-a1c6-d4d80f20758b` — "Which expression has the highest value?…"
- characterization: **templating artifact**

### #5: verbal.antonyms | medium

- n=35; largest cluster=6; clusters ≥2=3; in-clusters=10
- Cluster #1 (size=6, sim p50=0.9876):
  - `019e0967-62a7-7148-84c9-80221ea9635c` — "Which of the following is the opposite of the word "frugal"?…"
  - `019e096d-5623-71ce-b1e2-2ed46fa6377d` — "Which of the following is the opposite of the word "frugal"?…"
  - `019e0976-2074-7456-a1d8-51b6eee0e2a0` — "Which of the following is the opposite of the word "frugal"?…"
  - `019e099e-516e-77fb-87b9-6849dbcba841` — "Which of the following is the opposite of the word "frugal"?…"
  - `019e09af-c1b4-7203-acd8-a18e4d71ef7d` — "Which of the following is the opposite of the word "Frugal"?…"
  - `019e09b0-13bd-756a-8a4e-35d937af02bf` — "Which of the following is the opposite of the word Frugal?…"
- Cluster #2 (size=2, sim p50=1.0000):
  - `019e096d-1162-78bf-ab76-086275f802b0` — "Which of the following is the opposite of the word "squander…"
  - `019e096d-a549-78da-937b-4bf90b823699` — "Which of the following is the opposite of the word "squander…"
- Cluster #3 (size=2, sim p50=1.0000):
  - `019e0994-a632-779b-a182-00f08fe7e2b8` — "Which of the following is the opposite of the word "reticent…"
  - `019e099d-a9b6-7a42-8fe1-51cd121075a2` — "Which of the following is the opposite of the word "reticent…"
- characterization: **minor noise**

## Cleanup-scope estimate (descriptive only — not a recommendation)

If Leo decides cleanup at threshold 0.95 with a keep-1-per-cluster strategy, **186 candidates** would be removed across all sub-types (i.e., for each cluster of size k, keep 1 and drop k−1).
Of those, the templating-artifact contribution from `numerical.lowest_values` would be most of the count if not excluded.
