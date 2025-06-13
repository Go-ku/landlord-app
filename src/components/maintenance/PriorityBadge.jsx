export default function PriorityBadge({ priority }) {
    const priorityColors = {
      Low: 'bg-green-100 text-green-800',
      Medium: 'bg-yellow-100 text-yellow-800',
      High: 'bg-red-100 text-red-800',
      Emergency: 'bg-purple-100 text-purple-800'
    };
  
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityColors[priority] || 'bg-gray-100 text-gray-800'}`}>
        {priority}
      </span>
    );
  }