# TED Material Library
# URL storage and management for TED transcripts

import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional


class MaterialLibrary:
    """Manages a library of TED talk materials"""
    
    def __init__(self, library_file: str = "material_library.json"):
        self.library_file = Path(library_file)
        self.materials, self.next_id = self._load_library()
    
    def _load_library(self):
        """Load existing library or create new one"""
        if self.library_file.exists():
            with open(self.library_file, 'r') as f:
                data = json.load(f)
                # Handle both old format (list) and new format (dict with metadata)
                if isinstance(data, list):
                    materials = data
                    next_id = max([m['id'] for m in materials], default=0) + 1
                else:
                    materials = data.get('materials', [])
                    next_id = data.get('next_id', max([m['id'] for m in materials], default=0) + 1)
                return materials, next_id
        return [], 1
    
    def _save_library(self):
        """Save library to file with metadata"""
        data = {
            'materials': self.materials,
            'next_id': self.next_id
        }
        with open(self.library_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def add_url(self, url: str, title: str = "", description: str = "") -> Dict:
        """Add a TED talk URL to the library"""
        material = {
            "id": self.next_id,
            "url": url,
            "title": title or f"TED Talk {self.next_id}",
            "description": description,
            "date_added": datetime.now().isoformat(),
            "processed": False,
            "transcript_file": None,
            "learning_package_file": None
        }
        
        self.materials.append(material)
        self.next_id += 1
        self._save_library()
        return material
    
    def get_material(self, material_id: int) -> Optional[Dict]:
        """Get a specific material by ID"""
        for material in self.materials:
            if material['id'] == material_id:
                return material
        return None
    
    def get_all_materials(self) -> List[Dict]:
        """Get all materials in the library"""
        return self.materials
    
    def get_unprocessed_materials(self) -> List[Dict]:
        """Get materials that haven't been processed yet"""
        return [m for m in self.materials if not m['processed']]
    
    def mark_processed(self, material_id: int, transcript_file: str, package_file: str):
        """Mark a material as processed"""
        material = self.get_material(material_id)
        if material:
            material['processed'] = True
            material['transcript_file'] = transcript_file
            material['learning_package_file'] = package_file
            self._save_library()
    
    def remove_material(self, material_id: int) -> bool:
        """Remove a material from the library"""
        initial_length = len(self.materials)
        self.materials = [m for m in self.materials if m['id'] != material_id]
        if len(self.materials) < initial_length:
            self._save_library()
            return True
        return False
    
    def search_materials(self, query: str) -> List[Dict]:
        """Search materials by title or description"""
        query = query.lower()
        return [
            m for m in self.materials
            if query in m['title'].lower() or query in m['description'].lower()
        ]
    
    def list_materials(self) -> str:
        """Format materials as a readable list"""
        if not self.materials:
            return "No materials in library."
        
        lines = ["Material Library:", "=" * 60]
        for material in self.materials:
            status = "✓ Processed" if material['processed'] else "○ Pending"
            lines.append(f"\n[{material['id']}] {status}")
            lines.append(f"Title: {material['title']}")
            lines.append(f"URL: {material['url']}")
            if material['description']:
                lines.append(f"Description: {material['description']}")
            lines.append(f"Added: {material['date_added'][:10]}")
            if material['processed']:
                lines.append(f"Learning Package: {material['learning_package_file']}")
        
        return "\n".join(lines)


def main():
    """Example usage of MaterialLibrary"""
    library = MaterialLibrary()
    
    # Add some example materials
    library.add_url(
        "https://www.ted.com/talks/...",
        "The Future of Innovation",
        "A talk about how innovation shapes our world"
    )
    
    library.add_url(
        "https://www.ted.com/talks/...",
        "Sustainable Development Goals",
        "Understanding the UN's SDGs"
    )
    
    # List all materials
    print(library.list_materials())
    
    # Get unprocessed materials
    print("\nUnprocessed materials:")
    for material in library.get_unprocessed_materials():
        print(f"- {material['title']}")


if __name__ == "__main__":
    main()
