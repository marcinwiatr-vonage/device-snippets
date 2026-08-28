#!/usr/bin/env node
/**
 * Parses a GitHub issue created from the "new-snippet.yml" issue form template,
 * extracts the snippet fields, and appends a new entry to snippets-data.json.
 *
 * Expects the following environment variables:
 *  - ISSUE_BODY:   raw markdown body of the issue
 *  - ISSUE_NUMBER: issue number (used for logging / commit message)
 *
 * On success, writes the updated snippets-data.json and prints a JSON summary
 * to stdout prefixed with "RESULT_JSON:" so the workflow can pick it up.
 * On failure, exits with a non-zero code and prints the error to stderr.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'snippets-data.json');
const VALID_CATEGORIES = ['polycom', 'yealink', 'cisco', 'grandstream', 'algo', 'other'];

function fail(message) {
    console.error(`❌ ${message}`);
    process.exit(1);
}

// All known field labels, used to detect where one field ends and the
// next begins regardless of which format is used.
const ALL_LABELS = ['Title', 'Category', 'Description', 'Code', 'Tags', 'Notes'];

function stripFence(value) {
    const fenceMatch = value.match(/^```[a-zA-Z0-9]*\n([\s\S]*?)\n```$/);
    return fenceMatch ? fenceMatch[1] : value;
}

function getSection(body, label) {
    // Format A: GitHub issue-form style
    // ### Label
    //
    // value (possibly fenced in ``` for "render: text" textareas)
    const formPattern = new RegExp(`### ${label}\\s*\\n+([\\s\\S]*?)(?=\\n### |$)`, 'i');
    const formMatch = body.match(formPattern);

    // Format B: simple "Label: value" style, easy to produce from a Slack
    // Workflow Builder message/issue-body template, e.g.:
    //   Title: My Snippet
    //   Category: yealink
    //   Code:
    //   ```
    //   ...
    //   ```
    const otherLabels = ALL_LABELS.filter(l => l.toLowerCase() !== label.toLowerCase());
    const stopLookahead = otherLabels.map(l => `\\n${l}\\s*:`).join('|');
    const simplePattern = new RegExp(`(?:^|\\n)${label}\\s*:\\s*([\\s\\S]*?)(?=${stopLookahead}|$)`, 'i');
    const simpleMatch = body.match(simplePattern);

    let value;
    if (formMatch) {
        value = formMatch[1].trim();
    } else if (simpleMatch) {
        value = simpleMatch[1].trim();
    } else {
        return '';
    }

    value = stripFence(value).trim();

    // Treat common "empty" placeholder values as blank, since Slack
    // templates often fill unset optional fields with literal text like
    // "none" or "n/a" instead of leaving them blank.
    const EMPTY_VALUES = new Set(['_no response_', '(none)', 'none', 'n/a', 'na', '-']);
    if (EMPTY_VALUES.has(value.toLowerCase())) return '';
    return value;
}

function parseTags(raw) {
    if (!raw) return [];
    return raw
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
}

function extractTitleFromIssueTitle(issueTitle) {
    if (!issueTitle) return '';
    let t = issueTitle.trim();

    // Strip a leading "Title:" / "[Snippet]" style prefix some sources add.
    t = t.replace(/^\[?snippet\]?\s*[:\-]?\s*/i, '');
    t = t.replace(/^title\s*:\s*/i, '');

    // Strip a trailing "requested by: @someone" suffix some Slack workflows add.
    t = t.replace(/\s*requested by\s*:?\s*@?\S+\s*$/i, '');

    return t.trim();
}

function main() {
    const body = (process.env.ISSUE_BODY || '').replace(/\r\n/g, '\n');
    const issueNumber = process.env.ISSUE_NUMBER || 'unknown';
    const issueTitle = process.env.ISSUE_TITLE || '';

    if (!body.trim()) {
        fail('Issue body is empty; cannot parse snippet fields.');
    }

    let title = getSection(body, 'Title');
    if (!title) {
        // Fall back to deriving the title from the issue's own title, which
        // is how the Slack-created issues currently work (no "Title:" line
        // in the body; the snippet name is embedded in the issue title).
        title = extractTitleFromIssueTitle(issueTitle);
    }
    let category = getSection(body, 'Category').toLowerCase();
    const description = getSection(body, 'Description');
    const code = getSection(body, 'Code');
    const tags = parseTags(getSection(body, 'Tags'));
    const notes = getSection(body, 'Notes');

    const errors = [];
    if (!title) errors.push('Title is required.');
    if (!category) errors.push('Category is required.');
    if (category && !VALID_CATEGORIES.includes(category)) {
        errors.push(`Category "${category}" is not one of: ${VALID_CATEGORIES.join(', ')}.`);
    }
    if (!code) errors.push('Code is required.');

    if (errors.length) {
        fail(`Validation failed for issue #${issueNumber}:\n- ${errors.join('\n- ')}`);
    }

    let data;
    try {
        data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (err) {
        fail(`Failed to read/parse ${DATA_FILE}: ${err.message}`);
    }

    if (!Array.isArray(data.snippets)) {
        fail('snippets-data.json is missing a top-level "snippets" array.');
    }

    const maxId = data.snippets.reduce((max, s) => (typeof s.id === 'number' && s.id > max ? s.id : max), 0);
    const newSnippet = {
        id: maxId + 1,
        title,
        category,
        description,
        code,
        tags,
        notes
    };

    data.snippets.push(newSnippet);

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');

    console.log(`✅ Added snippet #${newSnippet.id} "${title}" (${category}) from issue #${issueNumber}`);
    console.log(`RESULT_JSON:${JSON.stringify(newSnippet)}`);
}

main();
