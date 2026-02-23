from uuid import UUID
from pydantic import BaseModel
from typing import List, Optional

class CategoryBase(BaseModel):
    name: str
    color: Optional[str] = None
    parent_id: Optional[UUID] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: UUID
    
    class Config:
        from_attributes = True
