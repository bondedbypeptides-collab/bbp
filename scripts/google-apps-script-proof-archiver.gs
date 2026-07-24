// ============================================
// BONDED BY PEPTIDES - FIREBASE SYNC SCRIPT
// + payment-proof Drive archiver (2026-07-22)
// ============================================
//
// PUSH: receives customer rows from the BBP admin dashboard, writes the
//   "Customers" sheet, AND copies every payment-proof image into Drive
//   (BBP Proof Archive / <batch name> /). Re-pushing skips files already
//   archived, so it is safe to push repeatedly and resumes after timeouts.
//   A "Drive Proof Links" column is added — those links survive Firebase
//   Storage cleanup. Only clean Storage after spot-checking the Drive folder.
// PULL: doGet returns the sheet back as JSON (unchanged behavior).

var SHEET_NAME = 'Customers';
var ARCHIVE_ROOT_FOLDER = 'BBP Proof Archive';

// Handle incoming data from the Web App (PUSH)
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    if (data.action === 'push') {
      var rows = data.customers || [];
      var batchName = String(data.batchName || 'Unnamed Batch');

      var archive = archiveProofsToDrive(rows, batchName);

      sheet.clear(); // Clear old data
      if (rows.length > 0) {
        // "Proof Links Array" is machine input for the archiver, not a column.
        var headers = Object.keys(rows[0]).filter(function (key) { return key !== 'Proof Links Array'; });
        headers.push('Drive Proof Links');
        var sheetData = [headers];

        rows.forEach(function (row) {
          var email = String(row.Email || '').toLowerCase().trim();
          var line = headers.map(function (h) {
            if (h === 'Drive Proof Links') return archive.driveLinksByEmail[email] || '';
            return row[h] !== undefined ? row[h] : '';
          });
          sheetData.push(line);
        });

        sheet.getRange(1, 1, sheetData.length, sheetData[0].length).setValues(sheetData);

        // Format the headers to look nice
        sheet.getRange(1, 1, 1, headers.length).setBackground('#FFC0CB').setFontWeight('bold').setFontColor('#4A042A');
        sheet.setFrozenRows(1);
        sheet.autoResizeColumns(1, headers.length);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Data pushed successfully!',
        proofsArchived: archive.archivedCount,
        proofsSkipped: archive.skippedCount,
        proofsFailed: archive.failedCount
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action: ' + data.action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    // Return the error safely so the React app doesn't crash
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle outgoing data to the Web App (PULL)
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var result = [];

    // Convert the 2D array back into an array of objects
    for (var i = 1; i < data.length; i++) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = data[i][j];
      }
      result.push(obj);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// RUN THIS ONCE after adding the archiver: Run > authorizeDrive > Run, then
// approve the Drive permission. The web app executes as the owner, so the owner
// must grant Drive access once or every push fails with "no permission to call
// DriveApp". Safe to re-run; it only reads the archive folder name.
function authorizeDrive() {
  var folder = getOrCreateFolder(DriveApp.getRootFolder(), ARCHIVE_ROOT_FOLDER);
  Logger.log('Drive authorized. Archive root: ' + folder.getName());
  return folder.getName();
}

// Download every proof URL into Drive (idempotent), return Drive links per email.
function archiveProofsToDrive(customers, batchName) {
  var folder = getOrCreateFolder(getOrCreateFolder(DriveApp.getRootFolder(), ARCHIVE_ROOT_FOLDER), sanitizeName(batchName));
  var existingNames = collectExistingFileNames(folder);

  var driveLinksByEmail = {};
  var archivedCount = 0;
  var skippedCount = 0;
  var failedCount = 0;

  customers.forEach(function (customer) {
    var email = String(customer.Email || '').toLowerCase().trim();
    var urls = proofUrlsFromRow(customer);
    if (!email || urls.length === 0) return;

    var driveLinks = [];
    urls.forEach(function (url, index) {
      var fileName = sanitizeName(email) + '_proof' + (index + 1) + extensionFromUrl(url);
      try {
        if (existingNames[fileName]) {
          driveLinks.push(existingNames[fileName]);
          skippedCount += 1;
          return;
        }
        var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
        if (response.getResponseCode() !== 200) {
          failedCount += 1;
          driveLinks.push('FETCH FAILED (' + response.getResponseCode() + ')');
          return;
        }
        var file = folder.createFile(response.getBlob().setName(fileName));
        var link = file.getUrl();
        existingNames[fileName] = link;
        driveLinks.push(link);
        archivedCount += 1;
      } catch (fetchErr) {
        failedCount += 1;
        driveLinks.push('FETCH FAILED');
      }
    });
    driveLinksByEmail[email] = driveLinks.join(' | ');
  });

  return {
    driveLinksByEmail: driveLinksByEmail,
    archivedCount: archivedCount,
    skippedCount: skippedCount,
    failedCount: failedCount
  };
}

// Proof URLs for one pushed row — prefers the array, falls back to joined cells.
function proofUrlsFromRow(customer) {
  if (Array.isArray(customer['Proof Links Array'])) {
    return customer['Proof Links Array'].filter(function (url) { return url && String(url).indexOf('http') === 0; });
  }
  var joined = String(customer['All Proof Links'] || customer['Proof Link'] || '');
  return joined.split('|').map(function (part) { return part.trim(); }).filter(function (part) { return part.indexOf('http') === 0; });
}

function collectExistingFileNames(folder) {
  var names = {};
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    names[file.getName()] = file.getUrl();
  }
  return names;
}

function getOrCreateFolder(parent, name) {
  var existing = parent.getFoldersByName(name);
  return existing.hasNext() ? existing.next() : parent.createFolder(name);
}

function sanitizeName(value) {
  return String(value || '').replace(/[^a-zA-Z0-9@._-]+/g, '_').slice(0, 120) || 'unnamed';
}

function extensionFromUrl(url) {
  var match = String(url).split('?')[0].match(/\.(jpg|jpeg|png|webp|gif|heic)$/i);
  return match ? '.' + match[1].toLowerCase() : '.jpg';
}
