import fs from 'fs';
import readline from 'readline';

const inputFile = 'MYSQL_SCHEMA_id_card.sql';
const outputFile = 'MYSQL_SCHEMA_id_card_fixed.sql';

console.log(`Processing ${inputFile} -> ${outputFile}...`);

const readStream = fs.createReadStream(inputFile, { encoding: 'utf8' });
const writeStream = fs.createWriteStream(outputFile, { encoding: 'utf8' });

// Write header to disable checks globally for the import session
writeStream.write("SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;\n");
writeStream.write("SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n");
writeStream.write("SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;\n");
writeStream.write("SET NAMES utf8mb4;\n\n");

const rl = readline.createInterface({
  input: readStream,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  // Check for lines that set checks (we handle them globally, but keeping them usually is fine unless they re-enable prematurely)
  // However, we want to ensure we don't accidentally re-enable checks in the middle if the dump has multiple sections.
  // The mysqldump output usually puts them at the very end.
  
  // We can just pass through all lines, but filter out any explicit "SET FOREIGN_KEY_CHECKS=1" if it appears in the middle (unlikely for mysqldump).
  // But let's just pass through for now, as the header we added is the most important part.
  
  // Remove DEFINER clauses to avoid permission issues
  // Remove DEFAULT uuid() for MariaDB/MySQL compatibility
  let processedLine = line.replace(/DEFINER=`[^`]+`@`[^`]+`/g, "");
  processedLine = processedLine.replace(/DEFINER=\w+@\w+/g, "");
  processedLine = processedLine.replace(/DEFAULT uuid\(\)/gi, "");
  writeStream.write(processedLine + '\n');
});

rl.on('close', () => {
  // Write footer to restore checks
  writeStream.write("\nSET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;\n");
  writeStream.write("SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;\n");
  writeStream.write("SET SQL_MODE=@OLD_SQL_MODE;\n");
  console.log('Done processing SQL file.');
});
