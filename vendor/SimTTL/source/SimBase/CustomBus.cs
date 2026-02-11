// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SimBase
{
    /// <summary>
    /// Definition of a special delegate for the custom conversion.
    /// </summary>
    /// <param name="Code">Opcode to be converted.</param>
    /// <returns>String custom converted from the code.</returns>
    public delegate string CustomConvHandler(uint Code);

    /// <summary>
    /// A SignalBus descendant for adding custom conversions capabilities. It can be used to convert the code into a mnemonic.
    /// </summary>
    public class CustomBus:SignalBus
    {
        /// <summary>Event to notify the special handler.</summary>
        public event CustomConvHandler CustomConvHandler;

        /// <summary>
        /// Creates the CustomBus instance.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        /// <param name="BusWidth">Width of the bus.</param>
        public CustomBus(string Name, int BusWidth) : base(Name, BusWidth) { }

        /// <summary>
        /// Creates the CustomBus instance.
        /// </summary>
        /// <param name="Name">Name of the bus</param>
        /// <param name="BusNets">List of nets to connect to.</param>
        public CustomBus(string Name, Net[] BusNets) : base(Name, BusNets) { }

        /// <summary>
        /// Method to perform the special conversion by using the CustomConvHandler event. 
        /// </summary>
        /// <param name="Code">Code to be converted to a string.</param>
        /// <returns>Conversion result from the event handler or a hexadecimal conversion, if no handler had been assigned.</returns>
        public string CustomConvert(uint Code)
        {
            if (CustomConvHandler == null)
                return Code.ToString("X");
            else
                return CustomConvHandler.Invoke(Code);
        }

    }
}
