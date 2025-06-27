// Script to process medicine CSV data and create optimized database
const fs = require('fs');

// Read the CSV file
const csvContent = fs.readFileSync('attached_assets/medicine_1750942957401.csv', 'utf8');

// Parse CSV data
function parseCSV(content) {
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    const medicines = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const values = [];
        let current = '';
        let inQuotes = false;
        
        // Handle CSV parsing with commas inside quotes
        for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        if (values.length >= 8) { // Ensure we have minimum required fields
            const medicine = {
                id: parseInt(values[0]) || i,
                name: values[1] || '',
                type: values[2] || 'allopathic',
                dosageForm: values[4] || 'tablet',
                generic: values[5] || '',
                strength: values[6] || '',
                manufacturer: values[7] || '',
                packageInfo: values[8] || ''
            };
            
            // Extract price from package info
            const priceMatch = medicine.packageInfo.match(/৳\s*([0-9,.]+)/);
            let price = 0;
            if (priceMatch) {
                price = parseFloat(priceMatch[1].replace(',', ''));
            }
            
            // Create standardized medicine object
            const standardizedMedicine = {
                name: medicine.name,
                generic: medicine.generic,
                company: medicine.manufacturer,
                power: medicine.strength,
                type: medicine.dosageForm.toLowerCase(),
                stripsPerBox: 10,  // Default values
                piecesPerStrip: 10,
                boxPrice: price || 100 // Use extracted price or default
            };
            
            if (standardizedMedicine.name && standardizedMedicine.name.length > 1) {
                medicines.push(standardizedMedicine);
            }
        }
    }
    
    return medicines;
}

// Process the data
const medicines = parseCSV(csvContent);

// Create optimized search index
const searchIndex = medicines.map(med => ({
    name: med.name.toLowerCase(),
    generic: med.generic.toLowerCase(),
    company: med.company.toLowerCase(),
    original: med
}));

// Generate JavaScript file with the data
const jsContent = `// Comprehensive Medicine Database - ${medicines.length} medicines
// Generated from CSV data

const comprehensiveMedicines = ${JSON.stringify(medicines, null, 2)};

// Optimized search function for large dataset
function searchMedicines(query, limit = 10) {
    const searchTerm = query.toLowerCase().trim();
    if (searchTerm.length < 2) return [];
    
    const results = [];
    
    for (let i = 0; i < comprehensiveMedicines.length && results.length < limit; i++) {
        const med = comprehensiveMedicines[i];
        const nameMatch = med.name.toLowerCase().includes(searchTerm);
        const genericMatch = med.generic.toLowerCase().includes(searchTerm);
        
        if (nameMatch || genericMatch) {
            // Prioritize exact matches and name matches
            const score = nameMatch ? (med.name.toLowerCase().startsWith(searchTerm) ? 3 : 2) : 1;
            results.push({ ...med, score });
        }
    }
    
    // Sort by relevance
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { comprehensiveMedicines, searchMedicines };
}
`;

// Write the processed data
fs.writeFileSync('js/medicine-database.js', jsContent);

console.log(`Processed ${medicines.length} medicines from CSV`);
console.log('Medicine database created at js/medicine-database.js');