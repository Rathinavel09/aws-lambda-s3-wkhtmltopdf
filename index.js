const querystring = require("querystring");
const AWS = require('aws-sdk');
const wkhtmltopdf = require('wkhtmltopdf');

const DEFAULT_FILTER = /\.html?$/; // essentially: *.htm, *.html
const DEFAULT_PAGESIZE = 'letter';
const PDF_CONTENTTYPE = 'application/pdf';

const filenameFilter = process.env['filename_filter'] || DEFAULT_FILTER;
const wkhtmltopdfOptions = {
	pageSize: process.env['page_size'] || DEFAULT_PAGESIZE,
	headerLeft: process.env['header_left'] || '',
	headerCenter: process.env['header_center'] || '',
	headerRight: process.env['header_right'] || '',
	footerLeft: process.env['footer_left'] || '',
	footerCenter: process.env['footer_center'] || '',
	footerRight: process.env['footer_right'] || '',
	zoom: process.env['page_zoom'] || 1,
	disableJavascript: ( String(process.env['disable_javascript']).toLowerCase() === 'true' ),
	printMediaType: ( String(process.env['print_media_type']).toLowerCase() === 'true' ),

	enableForms: ( String(process.env['enable_forms']).toLowerCase() === 'true' ),
	disableExternalLinks: ( String(process.env['disable_external_links']).toLowerCase() === 'true' ),
	noBackground: ( String(process.env['no_background']).toLowerCase() === 'true' ),
	noImages: ( String(process.env['no_images']).toLowerCase() === 'true' ),
	grayscale: ( String(process.env['grayscale']).toLowerCase() === 'true' ),

	disableLocalFileAccess: true // Non-configurable
}

process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];

const s3 = new AWS.S3();


console.info('Initializing', JSON.stringify(wkhtmltopdfOptions, null, 2));
exports.handler = function(event, context, callback) {
	const bucket = event.Records[0].s3.bucket.name;
	const key = event.Records[0].s3.object.key;
	const input_filename = decodeURIComponent(key.replace(/\+/g, ' '));
	const output_filename = key.replace(/\.[^.]+$/, '') + ".pdf"; // remove file extension, concat ".pdf"
	console.info('Invocation state =', JSON.stringify({
		bucket: bucket,
		key: key,
		input_filename: input_filename,
		output_filename: output_filename
	}, null, 2));

	if ( ! input_filename.match(filenameFilter) ) {
		console.info("Skipping", input_filename, "due to filter");
		callback(null, "No action taken.");
		return;
	}

	// Get bucket region so we can generate the s3-website url
	s3.getBucketLocation({ Bucket: bucket }, function(error, data) {
		if ( error ) {
			console.error('getBucketLocation failed!');
			callback(error);
			return;
		}

		const region = data.LocationConstraint || 'us-east-1';
		const url = 'http://' +  bucket + '.s3-website-' + region + '.amazonaws.com/' + key;
		console.log('Generating PDF for', url);

		// Convert to PDF
		wkhtmltopdf(url, wkhtmltopdfOptions, function(error, stream) {
			if ( error ) {
				console.error('wkhtmltopdf failed!');
				callback(error);
				return;
			}

			console.log('PDF generation was successful. Starting S3 upload...');

			// Upload to S3
			const s3PutParams = {
				Bucket: bucket,
				Key: output_filename,
				Body: stream.read(),
				ContentType: PDF_CONTENTTYPE,
				Metadata: { "x-amz-meta-requestId": context.awsRequestId },
				Tagging: querystring.stringify({ source: context.invokedFunctionArn })
			};
			s3.putObject(s3PutParams, function(error, data) {
				if ( error ) {
					console.error('s3:putObject failed!');
					callback(error);
					return;
				}

				console.log(output_filename, 'was uploaded successfully.');
				callback(null, 'Success');
			});
		});
	});
};
