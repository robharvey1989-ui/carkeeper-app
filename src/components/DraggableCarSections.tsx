import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Car, 
  Calendar, 
  Wrench, 
  Tag, 
  MapPin, 
  FileText, 
  ChevronUp, 
  ChevronDown, 
  Camera,
  GripVertical
} from 'lucide-react';
import { Car as CarType } from '@/hooks/useCars';
import { SectionType, useLayoutPreferences } from '@/hooks/useLayoutPreferences';
import MaintenanceView from './MaintenanceView';
import DocumentFolderView from './DocumentFolderView';
import ImageGalleryView from './ImageGalleryView';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DraggableCarSectionsProps {
  car: CarType;
  onCarUpdate: () => void;
}

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

const SortableItem = ({ id, children }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="group relative">
        <div
          {...attributes}
          {...listeners}
          className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground hover:text-foreground" />
        </div>
        {children}
      </div>
    </div>
  );
};

const DraggableCarSections = ({ car, onCarUpdate }: DraggableCarSectionsProps) => {
  const { layoutPreferences, updateSectionOrder, toggleSectionCollapse, isSectionCollapsed } = useLayoutPreferences(car.id);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = layoutPreferences.sectionOrder.indexOf(active.id as SectionType);
      const newIndex = layoutPreferences.sectionOrder.indexOf(over.id as SectionType);
      
      const newOrder = arrayMove(layoutPreferences.sectionOrder, oldIndex, newIndex);
      updateSectionOrder(newOrder);
    }
  };

  const sections = {
    info: (
      <Collapsible 
        open={!isSectionCollapsed('info')} 
        onOpenChange={() => toggleSectionCollapse('info')}
      >
        <Card className="bg-gradient-card border-automotive-blue/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-automotive-blue" />
                  Vehicle Information
                </div>
                {isSectionCollapsed('info') ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {car.year && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Year</span>
                    </div>
                    <Badge variant="secondary">{car.year}</Badge>
                  </div>
                )}

                {car.make && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Make</span>
                    </div>
                    <Badge variant="secondary">{car.make}</Badge>
                  </div>
                )}

                {car.model && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Model</span>
                    </div>
                    <Badge variant="secondary">{car.model}</Badge>
                  </div>
                )}

                {car.reg_number && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Registration</span>
                      </div>
                      <Badge variant="outline" className="font-mono">
                        {car.reg_number}
                      </Badge>
                    </div>
                  </>
                )}
              </div>

              <Separator />

              <div className="text-xs text-muted-foreground space-y-1">
                <div>Added: {new Date(car.created_at).toLocaleDateString()}</div>
                {car.updated_at !== car.created_at && (
                  <div>Updated: {new Date(car.updated_at).toLocaleDateString()}</div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    ),

    maintenance: (
      <MaintenanceView car={car} />
    ),

    documents: car.documents && car.documents.length > 0 ? (
      <Collapsible 
        open={!isSectionCollapsed('documents')} 
        onOpenChange={() => toggleSectionCollapse('documents')}
      >
        <Card className="bg-gradient-card border-automotive-blue/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-automotive-blue" />
                  Documents ({car.documents.length})
                </div>
                {isSectionCollapsed('documents') ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <DocumentFolderView car={{ id: car.id }} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    ) : null,

    images: car.images && car.images.length > 0 ? (
      <Collapsible 
        open={!isSectionCollapsed('images')} 
        onOpenChange={() => toggleSectionCollapse('images')}
      >
        <Card className="bg-gradient-card border-automotive-blue/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-automotive-blue" />
                  Images ({car.images.length})
                </div>
                {isSectionCollapsed('images') ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <ImageGalleryView car={car} onUpdated={onCarUpdate} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    ) : null,

    notes: car.notes ? (
      <Collapsible 
        open={!isSectionCollapsed('notes')} 
        onOpenChange={() => toggleSectionCollapse('notes')}
      >
        <Card className="bg-gradient-card border-automotive-blue/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-automotive-blue" />
                  Notes
                </div>
                {isSectionCollapsed('notes') ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{car.notes}</p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    ) : null
  };

  // Filter out null sections and get valid sections only
  const validSections = layoutPreferences.sectionOrder.filter(sectionId => sections[sectionId] !== null);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={validSections} strategy={verticalListSortingStrategy}>
        <div className="space-y-6">
          {validSections.map((sectionId) => (
            <SortableItem key={sectionId} id={sectionId}>
              {sections[sectionId]}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default DraggableCarSections;

