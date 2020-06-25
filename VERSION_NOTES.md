# Version Notes

## 1.0.46 (6/25/20)
- Behind the scenes changes for how we track channels on a file
- Feature: added Edit action next to uploads so that users can edit and delete files they uploaded
- Feature: warn users when saving changes to a template that will version the template
- Bugfix: fix issue where template editor was not clearing properly after closing

## 1.0.45 (6/16/20)
- Feature: toggle template hint visibility from settings and remember settings even after app closes
- Bugfix: fix upload draft saving mechanism. Now saving to separate files that can be accessed with native file explorer.
- Bugfix: don't show alert when creating a new template


## 1.0.44 (6/4/20)
- Behind the scenes code cleanup and upgrades
- Feature: make workflow editable on custom data page
- Bugfix: fix when undo button on custom data page is enabled
- Bugfix: don't show validation error if user hasn't touched required Yes/No fields 
- Bugfix: update Boolean editor on custom data page
- Bugfix: double clicking notes grid cell was causing issues

## 1.0.43 (5/26/20)
- Bugfix: fix runtime issue

## 1.0.42
- BROKEN version

## 1.0.38 - 1.0.41 
- No visible changes

## 1.0.37 (5/16/20)
- Feature: make main window full screen
- Bugfix: improve upload job polling
- Bugfix: limit alert and status bar heights
- Feature: collapse folder tree on pages not needed
- Feature: header and footer restyling


## 1.0.36 (4/29/20)
- Task: rename annotation types

## 1.0.35 (4/27/20)
- Bugfix: gather username from settings

## 1.0.34 (4/24/20)
- Feature: move upload job actions to upload table to make them easier to find

## 1.0.33 (4/3/20)
- Bugfix: don't show upload job poll error alerts
- Feature: enable users to change username in settings
- Feature: enable saving upload drafts and resuming later

## 1.0.32 (3/11/20)
- Feature: support scenes and sub images identified by name

## 1.0.31 (4/3/20)
- Feature: Allow users to set which username to use for requests
- Feature: Open and Save upload drafts

## 1.0.30 (2/25/20) (1.0.27-1.0.29 testing auto update)
- Feature: Style improvements
- Bugfix: Fix issue with annotations on scenes and channels not being unique per file

## 1.0.26 (2/21/20) (1.0.25 skipped accidentally):
- Feature: Make upload tab closeable
- Feature: cleanup styling, remove icons from progress bar
- Feature: Make file tags closeable on the pages that they get added on

## 1.0.24 (2/18/20):
- Bugfix: fix template selector on Search Files page
- Bugfix: make vial and barcode selectors return results faster

## 1.0.23 (2/6/20):
- Feature: Added support for uploading files from different imaging sessions of one plate together during an upload
- Bugfix: Added missing error validations for dropdown annotations on template editor
- Bugfix: Make error messages clearer when server comes back with validation errors for template editor
- Bugfix: Add more validations to the add custom data grid

## 1.0.22 (1/24/20):
- Bugfix: Fix app hang issues
- Bugfix: Automatically retry failed GET requests that may be due to service deployments


## 1.0.21:
- Bugfix: Fix permissions issues for files copied from isilon
- Bugfix: Update status bar when an upload completes successfully

## 1.0.20:
- Feature: Made folder tree collapsible
- Feature: Allow users to choose which files should be archived and stored on the Isilon
- Feature: Search page improvements
- Feature: Improve Upload Summary Page readability
- Bugfix: Updating a template now updates the grid on the Add Custom Data page
- Bugfix: Clear files in folder tree after an upload
- Bugfix: Fix upload retries


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
