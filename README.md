# aws-lambda-s3-wkhtmltopdf
Convert S3-website HTML to PF using Webkit (QtWebKit) on AWS Lambda.

## Required permissions
Permissions required to properly function.
* `s3:PutObject` - Upload the output PDF to the bucket
* `s3:PutObjectTagging` - Set tags on the uploaded PDF

Note that s3:GetObject is not used. The html page is loaded directly from the s3-website URL which requires public read.

## Optional permissions
CloudWatch logging permissions. If you **Create new role from template(s)**, these logging permissions will be automatically granted
* `logs:CreateLogGroup`
* `logs:CreateLogStream`
* `logs:PutLogEvents`

## Environment variables
All configuration is handled through **Environment variables** on the **AWS Management Console**. If not provided default values will be used.

| Variable | Description | Type | Default Value |
| -------- | ----------- | ---- | ------------- |
| `filename_filter` | Filename filter used by node.js for fine-grained filter | RegEx | .htm, .html |
| `page_size` | The size of PDF pages | String | 'letter' |
| `header_left` | Text to display left-aligned in the Header | String<sup>1</sup> | Empty string |
| `header_center` | Text to display center-aligned in the Header | String<sup>1</sup> | Empty string |
| `header_right` | Text to display right-aligned in the Header | String<sup>1</sup> | Empty string |
| `footer_left` | Text to display left-aligned in the Footer | String<sup>1</sup> | Empty string |
| `footer_center` | Text to display center-aligned in the Footer | String<sup>1</sup> | Empty string |
| `footer_right` | Text to display right-aligned in the Footer | String<sup>1</sup> | Empty string |
| `page_zoom` | Page scaling | Number | 1.00 |
| `disable_javascript` | Show JavaScript run on the webpage | Boolean<sup>2</sup> | false |
| `print_media_type` | Use the "print" media type when generating the PDF | Boolean<sup>2</sup> | false |
| `enable_forms` | Convert HTML form elements to PDF form elements | Boolean<sup>2</sup> | false |
| `disable_external_links` | Do not load resources from remote webpages | Boolean<sup>2</sup> | false |
| `no_background` | Do not print background | Boolean<sup>2</sup> | false |
| `no_images` | Do not load or print images | Boolean<sup>2</sup> | false |
| `grayscale` | Generate the PDF in grayscale | Boolean<sup>2</sup> | false |

<sup>1</sup> See [wkhtmltopdf documentation](http://wkhtmltopdf.org/usage/wkhtmltopdf.txt) > "Footers and Headers"

<sup>2</sup> Valid boolean values: "true" or "false"


## Create the AWS Lambda function

1. Log into your AWS account
2. Under Lambda, click **Create a Lambda function** button
3. Select **s3-get-object** as the **blueprint** and click the **Next** button
4. Configure Trigger
  1. **Bucket** - Select the S3-website bucket.
  2. **Event type** = **Object Created (All)**
  3. **Prefix** - Set based on your needs
  4. **Suffix** - Set based on your needs (Recommend: ".html")
  5. Check **Enable trigger**
  6. Click **Next** button
5. Configure function
  1. **Name** - Enter name of your function (e.g. "s3html-to-pdf"), 
  2. **Runtime** = **Node.js 4.3**
  3. **Code entry type** = **Upload a .ZIP file**
  4. Click **Upload** button to upload [this project as zip archive](https://github.com/jpaolin/aws-lambda-s3-wkhtmltopdf/releases/download/0.1/wkhtmltopdf.zip).
  5. Set desired **Environment variables** to configure the function
  6. **Role** = **Create new role from template(s)**
  7. **Role name** - Enter name for the new role (e.g. "s3html-to-pdf-lambda-role")
  9. **Policy templates** - Remove the default **S3 object read-only permission**. Leave this field empty.
  10. **Timeout** (under **Advanced settings**) - Set to **10 seconds** or more
  11. Click **Next** button
6. Review your configuration and click **Create function** button


## Configure additional permissions to the lamda role

1. Log into your AWS account
2. Under IAM, click **Policies** in the left navigation pane
3. Click **Create Policy** button
4. Select **Create Your Own Policy**
  1. **Policy Name** - Enter the name of the policy (e.g. "s3-pdfUpload-policy")
  2. **Policy Document** - Use the policy document below
  3. Click **Create Policy** button
5. Click **Roles** in the left navigation pane
6. Choose the Lambda Role we created earlier (e.g. "s3html-to-pdf-lambda-role")
  1. Click **Attach Policy** button on the **Permissions** tab
  2. Select the policy we just created (e.g. "s3-pdfUpload-policy")
  3. Click **Attach Policy** button

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectTagging"
            ],
            "Resource": [
                "arn:aws:s3:::*/*.pdf"
            ]
        }
    ]
}
```


## Testing function
For the test we will be using the **S3 Put** sample event, changing only the parameters that are used by the function

1. Click **Actions** button, then click **Configure test event**
2. Select **S3 Put**
3. In the JSON, update the following parameters
  1. `Records[0].s3.bucket.bucketname` - Enter your bucket's name
  2. `Records[0].s3.object.key` - Enter an existing html webpage from your bucket
4. Click **Save and test** button. If your function is working correctly, you should receive following output:


## Common Errors
### "/var/task/wkhtmltopdf: Permission denied"
The `wkhtmltopdf` command does not have execute permissions. 

Repackage zip to include POSIX execute permission (e.g. `755`) on this file


### "network error: ContentOperationNotPermittedError"
Resource returned `HTTP 403 - Forbidden` error. 

Ensure public read access on either bucket policy or ACLs.
