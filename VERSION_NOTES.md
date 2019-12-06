# Version Notes

## 1.0.19:
- Feature: Added Search tab for searching for files based on the annotation name and value (strict equality)

## 1.0.18:
- Feature: Allow users to set /allen/aics mount point
- Bugfix: small style changes

## 1.0.17:
- Feature: Updated the Enter Barcode page to be a Select Upload Type page instead
- Bugfix: Fixed page navigation issues
- Bugfix: Behind the scenes improvements for testing

## 1.0.15:
- Bugfix: Fix bug where deleting a row in the custom data grid would remove the child rows

## 1.0.14:
- Feature: We now support annotations that take multiple values. If your annotation is Text or a Number, you can add values
delimited by a comma. For other annotation types, the cell will include an edit icon which will open a new window when clicked
for adding more values
- Feature: The Upload Summary page (with the job statuses) no longer continuously polls for jobs for performance reasons.
 When polling stops, you can manually start it with a Refresh button that will appear
- Feature: Added a shortcut for adding multiple position indexes to a file (i.e. "1, 3, 14-40")
- Feature: Added a Dataset annotation
- Feature: Add support for Date annotation types
- Feature: Allow users to add Scenes/Channels to multiple files
- Feature: Show unrecoverable upload jobs using a grey status circle on the Upload Summary page
- Feature: added more hints in the UI
- Bugfix: clear out data created during an upload after an upload has been initiated
- Bugfix: Display template names and versions
- Bugfix: Allow users to annotate a channel on a file
- Bugfix: Made job statuses more reliable - jobs that failed should show as failed
- Bugfix: Fix bug where existing dropdown annotations could not be added to templates
- Bugfix: Fix issue regarding the annotation named Tag Location
- Bugfix: Fix warning alert as users are closing the app. Sometimes this alert was showing even if there were no jobs in progress

## 1.0.13
- Feature: stopped saving templates in files and started saving them to the database
- Feature: support scenes and channels

## 1.0.12
- Bugfix: Move custom metadata to new location on upload complete request
- Feature: Upload wizard status bar
- Feature: Allow additional files to be dropped on folder tree

## 1.0.11
- Feature: Allow users to retry uploads
- Bugfix: Added more validation to upload process and fixed copies for Windows clients
- Bugfix: Allow LIMS host to be changed at runtime
- Feature: Make loading schema required
- Bugfix: Make notes easier to spread across rows
- Bugfix: Don't allow users to select readonly files for upload

## 1.0.8
- Feature: Updated fields displayed in upload summary page
- Feature: Added job details modal that appears on click of an upload on the upload summary page

## 1.0.7
- Feature: Generate barcode before going to plate standalone
- Bugfix: Removed viability result information from plate page
- Feature: Enabled multi-well selection on plate

## 1.0.6
- Bugfix: validate metadata before uploading. if validation fails,
upload won't be executed.