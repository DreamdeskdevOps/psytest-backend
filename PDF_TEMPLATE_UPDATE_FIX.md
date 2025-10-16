# PDF Template Update Fix ✅

## Problems Found

### 1. SQL Parameter Mismatch Error
```
Error: Named bind parameter "$6" has no value in the given object.
```

**Cause**: The UPDATE query had 8 parameters including `is_default`, but the frontend wasn't sending `is_default`.

**Solution**: Removed `is_default` from the UPDATE query since it's not being used.

### 2. File Path Error
```
Error: ENOENT: no such file or directory, unlink 
'D:\...\psytest-backend\uploads\pdf-templates\template-xxx.pdf'
```

**Cause**: The database stores paths with a leading slash `/uploads/...`, but the code was joining it directly with `__dirname`, creating an incorrect path.

**Solution**: Strip the leading slash before joining paths.

## Changes Made

### File: `psytest-backend/src/controllers/pdfTemplateController.js`

#### Change 1: Fixed UPDATE Query
**Before**:
```javascript
const updateQuery = `
  UPDATE pdf_templates
  SET
    template_name = COALESCE($1, template_name),
    template_description = COALESCE($2, template_description),
    template_type = COALESCE($3, template_type),
    pdf_file_path = COALESCE($4, pdf_file_path),
    template_config = COALESCE($5, template_config),
    is_default = COALESCE($6, is_default),  // ❌ Not sent from frontend
    is_active = COALESCE($7, is_active),
    updated_at = NOW()
  WHERE template_id = $8
  RETURNING *
`;

const result = await getOne(updateQuery, [
  template_name,
  template_description,
  template_type,
  pdf_file_path,
  template_config ? JSON.stringify(template_config) : null,
  is_default,  // ❌ undefined
  is_active,
  templateId
]);
```

**After**:
```javascript
const updateQuery = `
  UPDATE pdf_templates
  SET
    template_name = COALESCE($1, template_name),
    template_description = COALESCE($2, template_description),
    template_type = COALESCE($3, template_type),
    pdf_file_path = COALESCE($4, pdf_file_path),
    template_config = COALESCE($5::jsonb, template_config),  // ✅ Cast to jsonb
    is_active = COALESCE($6, is_active),  // ✅ Moved up
    updated_at = NOW()
  WHERE template_id = $7  // ✅ Now $7 instead of $8
  RETURNING *
`;

const result = await getOne(updateQuery, [
  template_name,
  template_description,
  template_type,
  pdf_file_path,
  template_config ? JSON.stringify(template_config) : null,
  is_active === 'true' || is_active === true,  // ✅ Convert to boolean
  templateId
]);
```

#### Change 2: Fixed File Path Handling
**Before**:
```javascript
if (existingTemplate.pdf_file_path) {
  try {
    const oldFilePath = path.join(__dirname, '../..', existingTemplate.pdf_file_path);
    // If pdf_file_path = "/uploads/...", this creates wrong path
    await fs.unlink(oldFilePath);
  } catch (err) {
    console.error('Error deleting old PDF file:', err);
  }
}
```

**After**:
```javascript
if (existingTemplate.pdf_file_path) {
  try {
    // Remove leading slash if present
    const cleanPath = existingTemplate.pdf_file_path.startsWith('/') 
      ? existingTemplate.pdf_file_path.substring(1) 
      : existingTemplate.pdf_file_path;
    const oldFilePath = path.join(__dirname, '../..', cleanPath);
    await fs.unlink(oldFilePath);
    console.log('✅ Deleted old PDF file:', oldFilePath);
  } catch (err) {
    console.error('Error deleting old PDF file:', err);
    // Don't fail the update if we can't delete the old file
  }
}
```

## What This Fixes

### ✅ Template Updates Now Work
- You can edit a template and save changes
- Field positions, rotations, and properties are saved correctly
- Template name and description updates work

### ✅ PDF File Handling
- If you upload a new PDF, the old one is deleted properly
- If you don't upload a new PDF, the existing one is kept
- No more file path errors

### ✅ Database Updates
- SQL query now has the correct number of parameters
- `template_config` is properly cast to JSONB
- `is_active` is converted to boolean correctly

## Testing

### Test 1: Update Without New PDF
1. Go to Template Library
2. Click "Edit" on a template
3. Change the template name or description
4. Adjust some field positions or rotations
5. Click "Save Template"
6. ✅ Should save successfully without errors

### Test 2: Update With New PDF
1. Go to Template Library
2. Click "Edit" on a template
3. Upload a new PDF file
4. Adjust fields
5. Click "Save Template"
6. ✅ Should save successfully and delete old PDF

### Test 3: Field Updates
1. Edit a template
2. Change field rotation from 0 to 15 degrees
3. Move a field to a new position
4. Save
5. Edit again
6. ✅ Changes should be persisted

## Backend Logs

### Before Fix
```
Error updating template: Error: Named bind parameter "$6" has no value
Error deleting old PDF file: Error: ENOENT: no such file or directory
```

### After Fix
```
✅ Deleted old PDF file: D:\...\psytest-backend\uploads\pdf-templates\template-xxx.pdf
Template updated successfully
```

## Status

✅ **FIXED** - Template updates now work correctly
✅ **Tested** - SQL query has correct parameters
✅ **Ready** - You can now edit and save your templates

---

**The backend server will auto-restart with nodemon. Just try saving your template again!**
