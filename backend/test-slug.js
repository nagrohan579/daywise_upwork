// Test the name formatting functions
function generateBusinessName(name) {
  if (!name || typeof name !== 'string') {
    return 'My Business';
  }
  let cleaned = name
    .replace(/[_,;:.!?@#$%^&*()+=[\]{}|\\<>~`"']/g, ' ')
    .replace(/-/g, ' ')
    .trim();
  const words = cleaned.split(/\s+/).filter(word => word.length > 0);
  const titleCaseWords = words.map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  const businessName = titleCaseWords.join(' ') + "'s Business";
  return businessName;
}

function generateSlug(businessName) {
  if (!businessName || typeof businessName !== 'string') {
    return 'my-business';
  }
  let slug = businessName.toLowerCase();
  slug = slug.replace(/'/g, '');
  slug = slug.replace(/[\s_]+/g, '-');
  slug = slug.replace(/[^a-z0-9-]/g, '');
  slug = slug.replace(/-+/g, '-');
  slug = slug.replace(/^-+|-+$/g, '');
  if (!slug) {
    slug = 'my-business';
  }
  return slug;
}

// Test cases
console.log('\n=== Testing Business Name Generation ===\n');
const testNames = [
  'xyz_qwe abc_def',
  'daywise-test-rohan',
  'john_doe-smith',
  'Test___User',
  'user@123',
  'First,Last',
  'xyz_qwe',
  'ABC_DEF'
];

testNames.forEach(name => {
  const businessName = generateBusinessName(name);
  const slug = generateSlug(businessName);
  console.log(`Input: "${name}"`);
  console.log(`Business Name: "${businessName}"`);
  console.log(`Slug: "${slug}"`);
  console.log('---');
});
