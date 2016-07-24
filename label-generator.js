/**
 *
 */
class LabelGenerator {
    static generate(matrix = this.wordMatrix) {
        var name = "";
        // TODO: beautify this code
        for(var i = 0; i < matrix.length; i++) {
            name += matrix[i][ Math.floor(matrix[i].length * Math.random())];
        }
        return name;
    }

    static get wordMatrix() {
        return [
            ["Threadsafe", "Optimized", "Stable", "Automatic", "Abstract", "Serializable", "Writable",
                "Readable", "Executable", "Nonblocking", "Scriptable", "Smart", "Basic", "Checked",
                "ErrorCorrecting", "Simple", "Secure", "Cryptographic", "Flexible", "Configurable",
                "Internal", "Cloneable", "Legacy", "Recursive", "Multiple", "Threaded", "Virtual", "Singleton",
                "Stateless", "Stateful", "Localized", "Prioritized", "Generic", "Dynamic", "Shared", "Runnable",
                "Modal"],
            ["Byte", "Task", "Object", "Resource", "Mutex", "Memory", "List", "Node", "File", "Lock", "Pixel",
                "Character", "Command", "Client", "Server", "Socket", "Thread", "Notification", "Keystroke",
                "Timestamp", "Raster", "String", "Hash", "Integer", "Cache", "Scrollbar", "Grid", "Jar", "Connection",
                "Database", "Graph", "Row", "Column", "Record", "Metadata", "Transaction", "Message", "Request",
                "Response", "Query", "Statement", "Result", "Upload", "Download", "User", "Directory", "Button",
                "Device", "Search"],
            ["Sorter", "Allocator", "Tokenizer", "Writer", "Reader", "Randomizer", "Initializer", "Factory",
                "FactoryFactory", "Panel", "Frame", "Container", "Compressor", "Expander", "Counter",
                "Collector", "Collection", "Wrapper", "Accumulator", "Table", "Marshaller", "Demarshaller",
                "Extractor", "Parser", "Scanner", "Interpreter", "Validator", "Window", "Dialog", "Stream",
                "Listener", "Event", "Exception", "Vector", "Lexer", "Analyzer", "Iterator", "Set", "Tree",
                "Concatenator", "Monitor", "Tester", "Buffer", "Selector", "Visitor", "Adapter", "Helper",
                "Annotation", "Permission", "Info", "Action", "Channel", "Filter", "Manager", "Mediator",
                "Operation", "Context", "Queue", "Stack", "View", "Engine", "Publisher", "Subscriber", "Delegator",
                "State", "Processor", "Handler", "Generator", "Dispatcher", "Bundle", "Builder", "Logger",
                "Iterator", "Observer", "Encoder", "Decoder", "Importer", "Exporter", "Util", "Policy",
                "Preference", "Formatter", "Sequence", "Comparator", "Definition", "Timer", "Servlet",
                "Controller", "Loader", "Converter", "Constraint", "Module", "Migrator", "Descriptor"]];
    }
}
