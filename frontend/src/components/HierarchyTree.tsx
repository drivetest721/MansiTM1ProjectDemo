import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, File, Database } from 'lucide-react';

export interface HierarchyNode {
  id: string;
  name: string;
  type: 'dimension' | 'consolidation' | 'element';
  children?: HierarchyNode[];
  attributes?: Record<string, any>;
  level?: number;
}

interface HierarchyTreeProps {
  data: HierarchyNode[];
  title?: string;
  onNodeClick?: (node: HierarchyNode) => void;
}

export default function HierarchyTree({ data, title = 'Hierarchy', onNodeClick }: HierarchyTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getIcon = (node: HierarchyNode, isExpanded: boolean) => {
    if (node.type === 'dimension') {
      return <Database size={16} className="text-blue-600 dark:text-blue-400" />;
    }
    if (node.type === 'consolidation') {
      return isExpanded ? 
        <FolderOpen size={16} className="text-yellow-600 dark:text-yellow-400" /> : 
        <Folder size={16} className="text-yellow-600 dark:text-yellow-400" />;
    }
    return <File size={16} className="text-gray-500 dark:text-gray-400" />;
  };

  const renderNode = (node: HierarchyNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center gap-2 py-2 px-3 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-md cursor-pointer transition-colors ${
            level === 0 ? 'font-semibold' : ''
          }`}
          style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(node.id);
            }
            if (onNodeClick) {
              onNodeClick(node);
            }
          }}
        >
          {hasChildren ? (
            <button
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-6" />
          )}
          {getIcon(node, isExpanded)}
          <span className="text-sm text-gray-900 dark:text-gray-100">{node.name}</span>
          {node.attributes && Object.keys(node.attributes).length > 0 && (
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              ({Object.keys(node.attributes).length} attributes)
            </span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {data.map((node) => renderNode(node, 0))}
      </div>
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Click nodes to expand/collapse • Consolidations shown with folder icons
        </p>
      </div>
    </div>
  );
}
