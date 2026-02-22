from pydantic import BaseModel
from typing import List, Optional

class CategoryBase(BaseModel):
    name: str
    color: Optional[str] = None
    parent_id: Optional[int] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    
    class Config:
        from_attributes = True
