# Top N Flag-Based Scoring - Implementation Guide

## Overview
This implementation allows tests to use "Top 2", "Top 3", or "Top 4" scoring patterns where:
- Multiple flags are selected based on highest scores
- Each flag-score combination has a specific description
- All descriptions are combined into a final result

## Backend Implementation ✅

### 1. Database Schema
**Added Column:**
```sql
ALTER TABLE test_results ADD COLUMN flag_score INTEGER;
```

**Existing Table Used:**
- `result_components` table stores flag-score combinations:
  - `component_code`: Single flag (e.g., 'A', 'E', 'S')
  - `score_value`: Exact score for that flag
  - `component_name`: Name of the component
  - `description`: HTML description for this flag-score

### 2. Scoring Algorithm
**File:** `src/services/testAttemptService.js`

**Function:** `calculateTopNFlagScore()` (lines 888-1085)
- Calculates scores for ALL flags across the entire test
- Sorts flags by total score (descending)
- Takes top N based on `flagCount` from scoring pattern
- Looks up `result_components` for each flag-score combination
- Combines all descriptions into one result

**Example Flow:**
```
User Answers → Flag Scores: A=7, E=5, S=4, I=2, R=1
                      ↓
              Sort & Take Top 3
                      ↓
              Query Components:
              - A(7) → "High Analytical"
              - E(5) → "Moderate Extroversion"
              - S(4) → "Balanced Sensing"
                      ↓
              Combined Result:
              Code: "AES"
              Title: "High Analytical, Moderate Extroversion, Balanced Sensing"
              Description: [All three merged with \n\n]
```

### 3. Integration Points

**Modified:** `calculateSectionSpecificScore()` (lines 345-362)
```javascript
// Detects flagCount > 1 and switches to Top N scoring
if (flagCount > 1) {
  return await calculateTopNFlagScore(...);
}
```

**Modified:** `submitTestAttempt()` (lines 1222-1240)
```javascript
// Handles top_n_flag_based scoring type
else if (scoreResult.scoringType === 'top_n_flag_based') {
  resultData = {
    scoringType: 'top_n_flag_based',
    flagCount: scoreResult.flagCount,
    globalFlagScores: scoreResult.globalFlagScores,
    topFlags: scoreResult.topFlags,
    resultCode: scoreResult.resultCode,
    resultComponents: scoreResult.resultComponents,
    ...
  };
}
```

**Modified:** `getAllCompletedTestAttempts()` (lines 1427-1433)
```javascript
// Extracts Top N results when displaying
if (sectionScores.scoringType === 'top_n_flag_based') {
  resultCode = sectionScores.resultCode;
  resultTitle = sectionScores.resultTitle;
  resultDescription = sectionScores.resultDescription;
}
```

## Frontend Implementation ✅

**File:** `src/components/Results/Results.js`

The frontend already handles Top N results generically:
```javascript
score: attempt.result_title || attempt.result_code || 'N/A',
description: attempt.result_description || attempt.result_title
```

**What Users See:**
- **Result Title**: Combined component names
- **Result Description**: All component descriptions merged
- **Result Code**: Top N flags concatenated (e.g., "AES")

## How to Use

### Admin Setup:

1. **Create Test with Top N Scoring:**
   - Set scoring pattern with `flagCount = 2, 3, or 4`
   - Example: `{"flagCount": 3}`

2. **Add Result Components:**
   For each flag, create multiple components with different scores:
   ```
   Flag A, Score 1 → "Low Analytical"
   Flag A, Score 5 → "Moderate Analytical"
   Flag A, Score 10 → "High Analytical"

   Flag E, Score 1 → "Introverted"
   Flag E, Score 5 → "Balanced"
   Flag E, Score 10 → "Extroverted"
   ```

3. **Assign Flags to Questions:**
   - Each question should have a `question_flag` (A, E, S, etc.)
   - Questions can be across multiple sections

### User Experience:

1. **Take Test:** Answer all questions
2. **Submit:** System calculates all flag scores
3. **Result Generated:**
   - Top N flags identified
   - Components looked up for each flag-score
   - Descriptions combined
4. **Display:** Combined result shown in Results page

## Result Data Structure

**Saved in `test_attempts.section_scores`:**
```json
{
  "scoringType": "top_n_flag_based",
  "flagCount": 3,
  "globalFlagScores": {
    "A": 7,
    "E": 5,
    "S": 4,
    "I": 2,
    "R": 1
  },
  "topFlags": [
    {"flag": "A", "score": 7},
    {"flag": "E", "score": 5},
    {"flag": "S", "score": 4}
  ],
  "resultCode": "AES",
  "resultComponents": [
    {
      "flag": "A",
      "score": 7,
      "componentName": "High Analytical",
      "description": "..."
    },
    ...
  ],
  "resultTitle": "High Analytical, Moderate Extroversion, Balanced Sensing",
  "resultDescription": "[Combined descriptions]",
  "totalScore": 16,
  "questionCount": 20
}
```

## Testing

Run the test script:
```bash
node test_top_n_scoring.js
```

Expected output:
- ✅ flag_score column exists
- ✅ result_components table ready
- ✅ Top N scoring function implemented
- ✅ Submit endpoint updated

## Files Modified

**Backend:**
- `src/services/testAttemptService.js` - Added Top N scoring logic
- Database - Added `flag_score` column

**Frontend:**
- `src/components/Results/Results.js` - Already compatible

## Notes

- Top N scoring works **globally** across all sections, not per-section
- If exact score match not found in `result_components`, system uses highest score component as fallback
- Combined descriptions use `\n\n` separator
- Result code is concatenation of top N flags (e.g., "AES" for top 3)
