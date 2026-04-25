# Roadmap Progress Board Metadata and Sprint Tagging Conventions

## Overview

This document defines the metadata conventions for roadmap issues to enable automated import into GitHub Projects and external automation scripts. These conventions ensure deterministic parsing of issue IDs, dependencies, and sprint information.

## 🏷️ Frontmatter Schema

### Required Fields

```yaml
---
# Issue identification
issue_id: 270
title: "Add Sprint 1 exit checklist and readiness gates for Sprint 2"

# Sprint information
sprint: 1
sprint_name: "Platform Foundation and Domain Reset"
roadmap_issue: 100

# Domain categorization
domain: ["backend", "frontend-web", "mobile"]
primary_domain: "backend"

# Complexity estimation
complexity: "advanced"
estimated_hours: 40
story_points: 8

# Dependency management
dependencies: [1, 2, 3, 4, 5]
blocks: [271, 272]
related: [268, 269]

# Issue classification
type: "feature"
priority: "high"
status: "in-progress"

# Team assignment
assignee: "@username"
reviewer: "@reviewer-username"
labels: ["backend", "frontend-web", "mobile", "advanced"]

# Automation metadata
automated_test: true
ci_check_required: true
documentation_required: true
---
```

### Field Definitions

#### Identification Fields
- **issue_id** (number, required): Unique issue identifier within the roadmap
- **title** (string, required): Human-readable issue title
- **sprint** (number, required): Sprint number (1, 2, 3, etc.)
- **sprint_name** (string, required): Descriptive sprint name
- **roadmap_issue** (number, optional): Parent roadmap issue if this is a sub-task

#### Domain Classification
- **domain** (array of strings, required): Technical domains involved
  - Valid values: `backend`, `frontend-web`, `mobile`, `stellar`, `api`, `infrastructure`, `documentation`
- **primary_domain** (string, required): Main domain for assignment and routing

#### Complexity Estimation
- **complexity** (string, required): Complexity level
  - Valid values: `beginner`, `intermediate`, `advanced`, `expert`
- **estimated_hours** (number, optional): Estimated development hours
- **story_points** (number, optional): Agile story points (1-13 scale)

#### Dependency Management
- **dependencies** (array of numbers, optional): Issue IDs that must be completed first
- **blocks** (array of numbers, optional): Issue IDs that are blocked by this issue
- **related** (array of numbers, optional): Related issue IDs for context

#### Issue Classification
- **type** (string, required): Issue type
  - Valid values: `feature`, `bug`, `chore`, `documentation`, `testing`, `refactor`
- **priority** (string, required): Priority level
  - Valid values: `low`, `medium`, `high`, `critical`
- **status** (string, required): Current status
  - Valid values: `backlog`, `planned`, `in-progress`, `review`, `testing`, `done`

#### Team Assignment
- **assignee** (string, optional): GitHub username of assignee
- **reviewer** (string, optional): GitHub username of required reviewer
- **labels** (array of strings, required): GitHub labels for categorization

#### Automation Metadata
- **automated_test** (boolean, required): Whether automated tests are required
- **ci_check_required** (boolean, required): Whether CI checks must pass
- **documentation_required** (boolean, required): Whether documentation updates are needed

## 📋 Structured Comment Format

For issues that cannot include frontmatter (GitHub issues, etc.), use structured comments:

```markdown
<!-- ROADMAP_METADATA
{
  "issue_id": 270,
  "sprint": 1,
  "sprint_name": "Platform Foundation and Domain Reset",
  "domain": ["backend", "frontend-web", "mobile"],
  "primary_domain": "backend",
  "complexity": "advanced",
  "dependencies": [1, 2, 3, 4, 5],
  "type": "feature",
  "priority": "high",
  "status": "in-progress",
  "automated_test": true,
  "ci_check_required": true,
  "documentation_required": true
}
-->
```

## 🤖 Automation Script Integration

### Expected Mapping for GitHub CLI Script

```bash
#!/bin/bash
# Example gh script for importing roadmap issues

# Parse frontmatter from markdown files
parse_issue_metadata() {
    local file="$1"
    local frontmatter=$(sed -n '/^---$/,/^---$/p' "$file" | sed '1d;$d')
    
    # Extract fields using jq or similar
    local issue_id=$(echo "$frontmatter" | yq eval '.issue_id' -)
    local title=$(echo "$frontmatter" | yq eval '.title' -)
    local sprint=$(echo "$frontmatter" | yq eval '.sprint' -)
    local domain=$(echo "$frontmatter" | yq eval '.domain[]' -)
    local complexity=$(echo "$frontmatter" | yq eval '.complexity' -)
    local dependencies=$(echo "$frontmatter" | yq eval '.dependencies[]' -)
    
    # Create GitHub issue with metadata
    gh issue create \
        --title "$title" \
        --body "$(cat "$file")" \
        --label "sprint-$sprint" \
        --label "$complexity" \
        --label "$domain" \
        --label "roadmap-issue-$issue_id"
}
```

### Dependency Resolution

The automation should:

1. **Topologically sort** issues based on dependencies
2. **Create issues in dependency order** (dependencies first)
3. **Link related issues** using GitHub issue references
4. **Set up project boards** based on sprint and domain

### Project Board Structure

```
Sprint 1: Platform Foundation and Domain Reset/
├── Backlog/
│   ├── Backend/
│   ├── Frontend Web/
│   ├── Mobile/
│   └── Infrastructure/
├── In Progress/
│   ├── Backend/
│   ├── Frontend Web/
│   ├── Mobile/
│   └── Infrastructure/
├── Review/
├── Testing/
└── Done/
```

## 📝 File Naming Conventions

For roadmap documentation files:

```
docs/roadmap/
├── sprint-1/
│   ├── 001-platform-foundation.md
│   ├── 002-domain-reset.md
│   └── ...
├── sprint-2/
│   ├── 101-authentication.md
│   ├── 102-onboarding.md
│   └── ...
└── meta/
    ├── dependencies.json
    ├── sprint-progress.json
    └── automation-config.json
```

File naming format: `{issue_id:03d}-{slug}.md`

## 🔍 Validation Rules

### Required Fields Validation
- All required fields must be present
- `issue_id` must be unique across all issues
- `dependencies` must reference existing issue IDs
- `domain` values must be from the allowed list

### Dependency Validation
- No circular dependencies allowed
- All dependencies must have lower issue IDs (for topological sorting)
- Cross-sprint dependencies should be minimized

### Consistency Validation
- `labels` array should include `sprint-{sprint_number}`
- `labels` array should include all `domain` values
- `labels` array should include `complexity` value

## 📊 Progress Tracking

### Sprint Progress JSON Format

```json
{
  "sprint": 1,
  "name": "Platform Foundation and Domain Reset",
  "total_issues": 100,
  "completed_issues": 45,
  "in_progress_issues": 8,
  "blocked_issues": 2,
  "domains": {
    "backend": {"total": 40, "completed": 20, "in_progress": 4},
    "frontend-web": {"total": 30, "completed": 15, "in_progress": 2},
    "mobile": {"total": 20, "completed": 8, "in_progress": 1},
    "infrastructure": {"total": 10, "completed": 2, "in_progress": 1}
  },
  "complexity_breakdown": {
    "beginner": {"total": 20, "completed": 15},
    "intermediate": {"total": 50, "completed": 25},
    "advanced": {"total": 25, "completed": 5},
    "expert": {"total": 5, "completed": 0}
  }
}
```

## 🚀 Implementation Examples

### Example Issue Metadata

```yaml
---
issue_id: 270
title: "Add Sprint 1 exit checklist and readiness gates for Sprint 2"
sprint: 1
sprint_name: "Platform Foundation and Domain Reset"
roadmap_issue: 100
domain: ["backend", "frontend-web", "mobile"]
primary_domain: "backend"
complexity: "advanced"
estimated_hours: 40
story_points: 8
dependencies: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99]
type: "feature"
priority: "high"
status: "in-progress"
assignee: "@username"
reviewer: "@reviewer-username"
labels: ["backend", "frontend-web", "mobile", "advanced"]
automated_test: true
ci_check_required: true
documentation_required: true
---
```

## 📚 Usage Guidelines

1. **Always include frontmatter** in roadmap documentation files
2. **Use structured comments** for GitHub issues that can't contain frontmatter
3. **Validate metadata** before committing to ensure consistency
4. **Update progress tracking** files regularly
5. **Follow naming conventions** for easy automation parsing

---

*This document enables automated roadmap management and progress tracking across GitHub Projects and external tools.*
