# Media Metadata Analyzer

A desktop application for analyzing media file metadata, including EXIF, XMP, QuickTime, and MP4 metadata fields. Built with Electron, this tool is designed for photographers, videographers, and media professionals who need to inspect detailed information about their media files.

## Features

* **Drag & Drop**: Easily select media files by dragging them or browsing your system.
* **Video Support**: MP4, MOV, AVI, MKV, M4V.
* **Image Support**: JPG, JPEG, PNG, HEIC.
* **Comprehensive Metadata Extraction**: 
  * Camera information (make, model, lens).
  * Video settings (duration, resolution, FPS).
  * Camera settings (ISO, aperture, shutter speed, white balance).
  * Creation information (date, software used).
  * Embedded file references.
* **Viewing Options**: View metadata in a structured format or as raw JSON.
* **Export Options**: Export metadata to JSON, TXT, or CSV.
* **Bilingual Interface**: Fully supports English and Arabic.
* **Thumbnail Previews**: Automatic thumbnail generation for images.

## Installation

1. Ensure you have [Node.js](https://nodejs.org/) (v16 or higher) and npm installed.
2. Clone the repository to your local machine.
3. Install the required dependencies:
   ```bash
   npm install
   ```
4. Start the application:
   ```bash
   npm start
   ```

## Usage

1. Launch the application.
2. Drag and drop a media file onto the drop zone, or click **Browse Files**.
3. The metadata will be displayed in two tabs: **Structured Metadata** and **Raw Metadata**.
4. Use the export buttons at the bottom/top to save the metadata in JSON, TXT, or CSV format.
5. Switch between English and Arabic using the language buttons located in the header.

## Building

To package the application for your platform, run the following command:

```bash
npm run dist
```

The packaged executable application will be available in the generated `dist` folder.

## Technologies

* [Electron](https://www.electronjs.org/)
* [exiftool-vendored](https://github.com/photostructure/exiftool-vendored.js)
* [sharp](https://sharp.pixelplumbing.com/)
* [Monaco Editor](https://microsoft.github.io/monaco-editor/)
* [i18next](https://www.i18next.com/)

## License and Terms of Use

**This project is not open source. All rights reserved.**

You are permitted to use this software for personal or commercial purposes, provided that you:
* Give clear and prominent attribution to Eng. Firas Arafah.
* Obtain prior written permission from the author before using it.

You may not modify, alter, or create derivative works of this software, except by contributing your changes directly to the official repository (i.e., submitting a pull request). Any such contributions become part of the project and are subject to the same terms.

For permission requests, please contact the author.

## Copyright 
**Copyright © 2025** Eng.Firas Arafah. All rights reserved.