#!/usr/bin/env node
/**
 * Copies all items from one DynamoDB table to another.
 * Usage: node copy-dynamo-table.js <source-table> <dest-table> [region]
 *
 * Example:
 *   node copy-dynamo-table.js production-htc-races development-htc-races us-east-1
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

const [,, sourceTable, destTable, region = 'us-east-1'] = process.argv;

if (!sourceTable || !destTable) {
  console.error('Usage: node copy-dynamo-table.js <source-table> <dest-table> [region]');
  process.exit(1);
}

const client = new DynamoDBClient({ region });
const dynamo = DynamoDBDocumentClient.from(client);

async function copyTable() {
  console.log(`Copying: ${sourceTable} → ${destTable} (${region})`);

  let lastKey;
  let totalCopied = 0;

  do {
    const scanResult = await dynamo.send(new ScanCommand({
      TableName: sourceTable,
      ExclusiveStartKey: lastKey,
    }));

    const items = scanResult.Items || [];
    lastKey = scanResult.LastEvaluatedKey;

    if (items.length === 0) break;

    // BatchWrite supports max 25 items per call
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25).map(item => ({ PutRequest: { Item: item } }));
      await dynamo.send(new BatchWriteCommand({
        RequestItems: { [destTable]: batch },
      }));
    }

    totalCopied += items.length;
    console.log(`  Copied ${totalCopied} items so far...`);
  } while (lastKey);

  console.log(`Done. ${totalCopied} items copied to ${destTable}.`);
}

copyTable().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
