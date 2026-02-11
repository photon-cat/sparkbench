// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

//#define COMPILE
//#define DEBUG_WRITE

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace SimBase
{
    /// <summary>
    /// Jumper class with 2 pins.
    /// </summary>
    public class Jumper2 : BaseElement
    {
        /// <summary>True, if the jumper is bridged/closed.</summary>
        public bool Bridged;

        /// <summary>
        /// Creates the Jumper2 instance.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public Jumper2(string Name) : this(Name, null, null) { }

        /// <summary>
        /// Creates the Jumper2 instance.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        /// <param name="Net1">Net to connect to poin 1</param>
        /// <param name="Net2">Net to connect to poin 2</param>
        public Jumper2(string Name, Net Net1, Net Net2) : base(Name)
        {
            Power = new Pin[0];
            Ground = new Pin[0];
            Passive = new Pin[2];
            Passive[0] = new Pin(this, "1", "1");
            Passive[1] = new Pin(this, "2", "2");

            Bridged = false;
        }

    }


        /// <summary>
        /// Jumper class with 2 pins.
        /// </summary>
        public class Jumper3 : BaseElement
        {

            /// <summary>
            /// Definition of possible bridges.
            /// </summary>
            public enum BridgeType
            {
                None = 0,
                Bridge12 = 1,
                Bridge23 = 2
            }

            /// <summary>Defines which jumper is bridged/closed.</summary>
            public BridgeType Bridged;

            /// <summary>
            /// Creates the Jumper2 instance.
            /// </summary>
            /// <param name="Name">Name of the element.</param>
            public Jumper3(string Name) : base(Name)
            {
                Power = new Pin[0];
                Ground = new Pin[0];
                Passive = new Pin[3];
                Passive[0] = new Pin(this, "1", "1");
                Passive[1] = new Pin(this, "2", "2");
                Passive[2] = new Pin(this, "3", "3");
                Bridged = BridgeType.None;
            }

    }
}